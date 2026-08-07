package server

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestParseIPIPExitText(t *testing.T) {
	info, err := parseIPIPExitText("当前 IP：121.231.226.241  来自于：中国 江苏 常州  电信")
	if err != nil {
		t.Fatalf("parseIPIPExitText returned error: %v", err)
	}
	if info["ip"] != "121.231.226.241" {
		t.Fatalf("ip mismatch: %#v", info)
	}
	if info["location"] != "中国 江苏 常州 电信" {
		t.Fatalf("location mismatch: %#v", info)
	}
	if info["country"] != "中国" || info["province"] != "江苏" || info["city"] != "常州" || info["isp"] != "电信" {
		t.Fatalf("location parts mismatch: %#v", info)
	}
}

func TestNormalizeInternationalExit(t *testing.T) {
	info := normalizeInternationalExit(map[string]any{
		"ip":           "198.51.100.10",
		"country":      "Exampleland",
		"region":       "Example Region",
		"city":         "Example City",
		"organization": "Example Transit",
	})
	if info["ip"] != "198.51.100.10" {
		t.Fatalf("ip mismatch: %#v", info)
	}
	if info["location"] != "Exampleland Example Transit" {
		t.Fatalf("location mismatch: %#v", info)
	}
	if info["region"] != "Example Region" || info["city"] != "Example City" || info["isp"] != "Example Transit" {
		t.Fatalf("metadata mismatch: %#v", info)
	}
}

func TestNormalizeInternationalExitUsesCarrierWhenAvailable(t *testing.T) {
	info := normalizeInternationalExit(map[string]any{
		"ip":               "121.231.226.241",
		"country":          "China",
		"isp":              "China Telecom",
		"asn_organization": "CHINATELECOM Jiangsu province Changzhou 5G network",
	})
	if info["location"] != "China China Telecom" {
		t.Fatalf("location should prefer carrier: %#v", info)
	}
}

func TestMihomoExitProxyURLPrefersMixedPort(t *testing.T) {
	app := newTestApp(t)
	configDir := filepath.Join(app.DataDir, "configs", "mihomo")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(configDir, "config.yaml"), []byte("port: 7890\nmixed-port: 7892\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	proxyURL, err := app.mihomoExitProxyURL()
	if err != nil {
		t.Fatal(err)
	}
	if got, want := proxyURL.String(), "http://127.0.0.1:7892"; got != want {
		t.Fatalf("proxy URL mismatch: got %q want %q", got, want)
	}
}

func TestMihomoExitProxyURLFallsBackToHTTPPort(t *testing.T) {
	app := newTestApp(t)
	configDir := filepath.Join(app.DataDir, "configs", "mihomo")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(configDir, "config.yaml"), []byte("port: 7890\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	proxyURL, err := app.mihomoExitProxyURL()
	if err != nil {
		t.Fatal(err)
	}
	if got, want := proxyURL.String(), "http://127.0.0.1:7890"; got != want {
		t.Fatalf("proxy URL mismatch: got %q want %q", got, want)
	}
}

func TestMihomoExitProxyURLRejectsMissingHTTPProxyPort(t *testing.T) {
	app := newTestApp(t)
	configDir := filepath.Join(app.DataDir, "configs", "mihomo")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(configDir, "config.yaml"), []byte("mode: rule\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := app.mihomoExitProxyURL(); err == nil {
		t.Fatal("missing Mihomo HTTP/mixed proxy port should return an error")
	}
}

func TestNetworkExitHTTPClientUsesConfiguredProxy(t *testing.T) {
	targets := make(chan string, 1)
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		targets <- r.URL.Host
		_, _ = fmt.Fprint(w, "proxied")
	}))
	defer proxy.Close()
	proxyURL, err := url.Parse(proxy.URL)
	if err != nil {
		t.Fatal(err)
	}
	client := networkExitHTTPClient(time.Second, proxyURL)
	response, err := client.Get("http://example.invalid/exit-check")
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("unexpected proxy response status: %d", response.StatusCode)
	}
	if got, want := <-targets, "example.invalid"; got != want {
		t.Fatalf("proxy received target %q, want %q", got, want)
	}
}
