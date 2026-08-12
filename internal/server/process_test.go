package server

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestServiceStartReportsNewStdoutFailure(t *testing.T) {
	app := newTestApp(t)
	installTestMihomoBinary(t, app, "echo 'level=fatal msg=proxy group member not found'\nexit 1\n")

	_, err := app.Services.Start(context.Background(), "mihomo")
	if err == nil || !strings.Contains(err.Error(), "proxy group member not found") {
		t.Fatalf("stdout startup failure should be returned, got %v", err)
	}
}

func TestRemovePIDFileOnlyRemovesOwnedProcess(t *testing.T) {
	path := filepath.Join(t.TempDir(), "service.pid")
	if err := os.WriteFile(path, []byte("222"), 0644); err != nil {
		t.Fatal(err)
	}
	removePIDFileIfMatches(path, 111)
	if got := readPID(path); got != 222 {
		t.Fatalf("old process cleanup removed replacement PID: got %d", got)
	}
	removePIDFileIfMatches(path, 222)
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("owned PID file should be removed, stat err=%v", err)
	}
}
