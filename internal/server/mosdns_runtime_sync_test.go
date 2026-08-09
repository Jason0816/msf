package server

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

type mosDNSRuntimeCall struct {
	Method string
	Path   string
	Body   []byte
}

func TestMosDNSPersonalRulesHotSyncRuntime(t *testing.T) {
	app := newTestApp(t)
	token := tokenForRole(t, app, "admin")
	calls := make(chan mosDNSRuntimeCall, 16)
	controller := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		calls <- mosDNSRuntimeCall{Method: r.Method, Path: r.URL.Path, Body: body}
		_, _ = w.Write([]byte("ok"))
	}))
	defer controller.Close()
	app.setSetting("mosdns_api_endpoint", controller.URL)
	markMosDNSRunningForTest(t, app)

	tests := []struct {
		category string
		tag      string
		pattern  string
	}{
		{category: "whitelist", tag: "whitelist", pattern: "domain:direct.example"},
		{category: "blocklist", tag: "blocklist", pattern: "full:ads.example"},
		{category: "greylist", tag: "greylist", pattern: "domain:proxy.example"},
		{category: "ddnslist", tag: "ddnslist", pattern: "full:home.example"},
		{category: "direct_ip", tag: "direct_ip", pattern: "192.0.2.0/24"},
		{category: "redirect", tag: "rewrite", pattern: "full:edge.example 192.0.2.10"},
	}
	for _, test := range tests {
		t.Run(test.category, func(t *testing.T) {
			res := requestJSON(t, app, http.MethodPost, "/api/v1/mosdns/rules/"+test.category, token, map[string]any{"pattern": test.pattern})
			if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"restart_required":false`) {
				t.Fatalf("rule mutation status=%d body=%s", res.Code, res.Body.String())
			}
			call := <-calls
			if call.Method != http.MethodPost || call.Path != "/plugins/"+test.tag+"/post" {
				t.Fatalf("runtime call = %s %s, want POST /plugins/%s/post", call.Method, call.Path, test.tag)
			}
			var payload struct {
				Values []string `json:"values"`
			}
			if err := json.Unmarshal(call.Body, &payload); err != nil {
				t.Fatal(err)
			}
			found := false
			for _, value := range payload.Values {
				if value == test.pattern {
					found = true
					break
				}
			}
			if !found {
				t.Fatalf("runtime values do not contain %q: %#v", test.pattern, payload.Values)
			}
			assertMosDNSFrontCacheFlushes(t, calls)
		})
	}
}

func TestMosDNSClientListHotSyncsAddAndRemove(t *testing.T) {
	app := newTestApp(t)
	token := tokenForRole(t, app, "admin")
	calls := make(chan mosDNSRuntimeCall, 4)
	controller := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		calls <- mosDNSRuntimeCall{Method: r.Method, Path: r.URL.Path, Body: body}
		_, _ = w.Write([]byte("ok"))
	}))
	defer controller.Close()
	app.setSetting("mosdns_api_endpoint", controller.URL)
	markMosDNSRunningForTest(t, app)

	create := requestJSON(t, app, http.MethodPost, "/api/v1/mosdns/clients", token, map[string]any{
		"ip": "192.168.10.88", "hostname": "unit-client", "type": "allow",
	})
	if create.Code != http.StatusOK {
		t.Fatalf("create client status=%d body=%s", create.Code, create.Body.String())
	}
	assertMosDNSRuntimeValues(t, <-calls, "client_ip", []string{"192.168.10.88"})
	assertMosDNSFrontCacheFlushes(t, calls)

	remove := requestJSON(t, app, http.MethodPost, "/api/v1/mosdns/clients/192.168.10.88/move", token, map[string]string{"status": "disabled"})
	if remove.Code != http.StatusOK {
		t.Fatalf("remove client status=%d body=%s", remove.Code, remove.Body.String())
	}
	assertMosDNSRuntimeValues(t, <-calls, "client_ip", []string{})
	assertMosDNSFrontCacheFlushes(t, calls)
}

func TestMosDNSHotSyncFailurePromptsForRestart(t *testing.T) {
	app := newTestApp(t)
	token := tokenForRole(t, app, "admin")
	controller := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("Invalid request POST " + r.URL.Path))
	}))
	defer controller.Close()
	app.setSetting("mosdns_api_endpoint", controller.URL)
	markMosDNSRunningForTest(t, app)

	res := requestJSON(t, app, http.MethodPost, "/api/v1/mosdns/rules/whitelist", token, map[string]any{"pattern": "domain:saved.example"})
	if res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "请重启 MosDNS 后生效") {
		t.Fatalf("hot sync failure should prompt restart: status=%d body=%s", res.Code, res.Body.String())
	}
	content, err := os.ReadFile(filepath.Join(app.DataDir, "configs/mosdns/rule/whitelist.txt"))
	if err != nil || !strings.Contains(string(content), "domain:saved.example") {
		t.Fatalf("rule should remain saved after runtime failure: content=%q err=%v", string(content), err)
	}
}

func TestMosDNSRuleSourceRuntimeTagMapping(t *testing.T) {
	tests := map[string]string{
		"geositecn":   "geosite_cn",
		"geositenocn": "geosite_no_cn",
		"geoipcn":     "geoip_cn",
		"cuscn":       "cuscn",
		"cusnocn":     "cusnocn",
	}
	for sourceType, want := range tests {
		if got := mosDNSRuleSourcePluginTag(sourceType); got != want {
			t.Fatalf("plugin tag for %q = %q, want %q", sourceType, got, want)
		}
	}
}

func TestMosDNSRuleSourcesUsePluginRuntimeAPIs(t *testing.T) {
	app := newTestApp(t)
	token := tokenForRole(t, app, "admin")
	calls := make(chan mosDNSRuntimeCall, 4)
	controller := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		calls <- mosDNSRuntimeCall{Method: r.Method, Path: r.URL.Path, Body: body}
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/plugins/adguard/rules" {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "runtime-adguard-id", "name": "unit-adguard", "url": "https://example.com/adguard.txt",
				"enabled": true, "auto_update": true, "update_interval_hours": 24,
			})
			return
		}
		_, _ = w.Write([]byte(`{}`))
	}))
	defer controller.Close()
	app.setSetting("mosdns_api_endpoint", controller.URL)
	markMosDNSRunningForTest(t, app)

	srs := requestJSON(t, app, http.MethodPost, "/api/v1/mosdns/rule-sets", token, map[string]any{
		"source_type": "srs", "name": "unit-srs", "type": "cusnocn", "files": "srs/unit-srs.srs",
		"url": "https://example.com/unit-srs.srs", "enabled": true,
	})
	if srs.Code != http.StatusCreated || !strings.Contains(srs.Body.String(), `"restart_required":false`) {
		t.Fatalf("create SRS source status=%d body=%s", srs.Code, srs.Body.String())
	}
	srsCall := <-calls
	if srsCall.Method != http.MethodPut || srsCall.Path != "/plugins/cusnocn/config/unit-srs" {
		t.Fatalf("SRS runtime call = %s %s", srsCall.Method, srsCall.Path)
	}
	assertMosDNSFrontCacheFlushes(t, calls)

	adguard := requestJSON(t, app, http.MethodPost, "/api/v1/mosdns/rule-sets", token, map[string]any{
		"source_type": "adguard", "name": "unit-adguard", "type": "adguard",
		"url": "https://example.com/adguard.txt", "enabled": true, "auto_update": true,
	})
	if adguard.Code != http.StatusCreated || !strings.Contains(adguard.Body.String(), "runtime-adguard-id") {
		t.Fatalf("create AdGuard source status=%d body=%s", adguard.Code, adguard.Body.String())
	}
	adguardCall := <-calls
	if adguardCall.Method != http.MethodPost || adguardCall.Path != "/plugins/adguard/rules" {
		t.Fatalf("AdGuard runtime call = %s %s", adguardCall.Method, adguardCall.Path)
	}
	assertMosDNSFrontCacheFlushes(t, calls)
	config, err := os.ReadFile(filepath.Join(app.DataDir, "configs/mosdns/adguard/config.json"))
	if err != nil || !strings.Contains(string(config), "runtime-adguard-id") {
		t.Fatalf("AdGuard runtime id should be reconciled locally: config=%s err=%v", string(config), err)
	}
}

func TestMosDNSRuleSourceIdentityChangeDeletesThenCreates(t *testing.T) {
	app := newTestApp(t)
	calls := make(chan mosDNSRuntimeCall, 4)
	controller := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		calls <- mosDNSRuntimeCall{Method: r.Method, Path: r.URL.Path, Body: body}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))
	}))
	defer controller.Close()
	app.setSetting("mosdns_api_endpoint", controller.URL)
	markMosDNSRunningForTest(t, app)

	previous := mosDNSRuleSource{SourceType: "srs", Type: "cuscn", Name: "old-name"}
	next := mosDNSRuleSource{
		SourceType: "srs", Type: "cusnocn", Name: "new-name", Files: "srs/new-name.srs",
		URL: "https://example.com/new-name.srs", Enabled: true,
	}
	if _, err := app.updateMosDNSRuleSourceRuntime(previous, next); err != nil {
		t.Fatal(err)
	}
	deleted := <-calls
	if deleted.Method != http.MethodDelete || deleted.Path != "/plugins/cuscn/config/old-name" {
		t.Fatalf("delete runtime call = %s %s", deleted.Method, deleted.Path)
	}
	created := <-calls
	if created.Method != http.MethodPut || created.Path != "/plugins/cusnocn/config/new-name" {
		t.Fatalf("create runtime call = %s %s", created.Method, created.Path)
	}
	assertMosDNSFrontCacheFlushes(t, calls)
}

func assertMosDNSRuntimeValues(t *testing.T, call mosDNSRuntimeCall, tag string, want []string) {
	t.Helper()
	if call.Method != http.MethodPost || call.Path != "/plugins/"+tag+"/post" {
		t.Fatalf("runtime call = %s %s, want POST /plugins/%s/post", call.Method, call.Path, tag)
	}
	var payload struct {
		Values []string `json:"values"`
	}
	if err := json.Unmarshal(call.Body, &payload); err != nil {
		t.Fatal(err)
	}
	if strings.Join(payload.Values, ",") != strings.Join(want, ",") {
		t.Fatalf("runtime values = %#v, want %#v", payload.Values, want)
	}
}

func assertMosDNSFrontCacheFlushes(t *testing.T, calls <-chan mosDNSRuntimeCall) {
	t.Helper()
	want := map[string]bool{
		"/plugins/cache_all/flush":        false,
		"/plugins/cache_all_noleak/flush": false,
	}
	for range 2 {
		call := <-calls
		if call.Method != http.MethodGet {
			t.Fatalf("cache flush method = %s, want GET", call.Method)
		}
		if _, ok := want[call.Path]; !ok {
			t.Fatalf("unexpected cache flush path %s", call.Path)
		}
		want[call.Path] = true
	}
	for path, seen := range want {
		if !seen {
			t.Fatalf("missing cache flush %s", path)
		}
	}
}

func markMosDNSRunningForTest(t *testing.T, app *App) {
	t.Helper()
	pidPath := filepath.Join(app.DataDir, "data/mosdns.pid")
	if err := os.MkdirAll(filepath.Dir(pidPath), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(pidPath, []byte(strconv.Itoa(os.Getpid())), 0644); err != nil {
		t.Fatal(err)
	}
}
