package server

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestMosDNSRuleSourcesUseLocalArtifactModificationTime(t *testing.T) {
	app := newTestApp(t)
	configDir := filepath.Join(app.DataDir, "configs", "mosdns", "srs")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	artifact := filepath.Join(configDir, "unit.srs")
	if err := os.WriteFile(artifact, []byte("binary-rule-data"), 0o644); err != nil {
		t.Fatal(err)
	}
	want := time.Date(2026, time.August, 10, 9, 8, 7, 0, time.UTC)
	if err := os.Chtimes(artifact, want, want); err != nil {
		t.Fatal(err)
	}
	config := `[
  {
    "name": "unit",
    "type": "cuscn",
    "files": "srs/unit.srs",
    "url": "https://example.invalid/unit.srs",
    "enabled": true,
    "last_updated": "2025-12-19T16:32:42+08:00"
  }
]`
	if err := os.WriteFile(filepath.Join(configDir, "cuscn.json"), []byte(config), 0o644); err != nil {
		t.Fatal(err)
	}

	sources := app.mosDNSRuleSources()
	for _, source := range sources {
		if source.Name != "unit" {
			continue
		}
		got, err := time.Parse(time.RFC3339Nano, source.LastUpdated)
		if err != nil {
			t.Fatalf("parse last_updated %q: %v", source.LastUpdated, err)
		}
		if !got.Equal(want) {
			t.Fatalf("last_updated=%s want artifact mtime %s", got, want)
		}
		return
	}
	t.Fatal("unit rule source not found")
}

func TestCurrentBuiltInMosDNSRuleSourceURLRepairsRemovedGeositePrefix(t *testing.T) {
	cases := map[string]string{
		"https://raw.githubusercontent.com/nekolsd/sing-geosite/refs/heads/rule-set/geosite-geolocation-!cn%40cn.srs": "https://raw.githubusercontent.com/nekolsd/sing-geosite/refs/heads/rule-set/geolocation-!cn%40cn.srs",
		"https://raw.githubusercontent.com/nekolsd/sing-geosite/refs/heads/rule-set/geosite-cn%40!cn.srs":                  "https://raw.githubusercontent.com/nekolsd/sing-geosite/refs/heads/rule-set/cn%40!cn.srs",
		"https://raw.githubusercontent.com/nekolsd/sing-geosite/refs/heads/rule-set/geosite-tiktok.srs":                    "https://raw.githubusercontent.com/nekolsd/sing-geosite/refs/heads/rule-set/tiktok.srs",
	}
	for legacy, want := range cases {
		if got := currentBuiltInMosDNSRuleSourceURL(legacy); got != want {
			t.Fatalf("url=%q want %q", got, want)
		}
	}
}
