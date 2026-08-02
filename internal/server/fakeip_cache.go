package server

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func fakeIPPrefixChanged(oldCfg, newCfg SetupConfig) bool {
	return fakeIPv4RouteCIDR(oldCfg.FakeIPRangeV4) != fakeIPv4RouteCIDR(newCfg.FakeIPRangeV4) ||
		fakeIPv6RouteCIDR(oldCfg.FakeIPRangeV6) != fakeIPv6RouteCIDR(newCfg.FakeIPRangeV6)
}

func (a *App) clearFakeIPCaches() error {
	if a.Services.Status("mosdns").Running {
		var flushErr error
		for _, path := range []string{"/cache/flush", "/api/cache/flush", "/plugins/cache/flush"} {
			flushErr = httpPostNoBody(a.mosDNSAPIURL(path))
			if flushErr == nil {
				break
			}
		}
		if flushErr != nil {
			return fmt.Errorf("flush MosDNS FakeIP cache: %w", flushErr)
		}
	}
	if a.Services.Status("mihomo").Running {
		if _, ok, err := a.mihomoControllerJSON(http.MethodDelete, "/cache/fakeip", nil); !ok {
			if err == nil {
				err = fmt.Errorf("Mihomo FakeIP cache endpoint unavailable")
			}
			return fmt.Errorf("flush Mihomo FakeIP cache: %w", err)
		}
	}
	cacheDir := filepath.Join(a.DataDir, "configs/mosdns/cache")
	entries, err := os.ReadDir(cacheDir)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	for _, entry := range entries {
		name := strings.ToLower(entry.Name())
		if entry.IsDir() || (!strings.Contains(name, "cache") && !strings.Contains(name, "dump")) {
			continue
		}
		if err := os.Remove(filepath.Join(cacheDir, entry.Name())); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return nil
}
