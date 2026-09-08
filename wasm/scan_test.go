package main

import (
	"strings"
	"testing"
)

func TestScan(t *testing.T) {
	for _, tc := range []struct {
		name    string
		request request
		code    int
		message string
	}{
		{"empty", request{Input: `{"mcpServers":{}}`}, 0, `"complete":true`},
		{"warning", request{Input: `{"mcpServers":{"docs":{"url":"http://example.com"}}}`}, 1, "remote-http"},
		{"threshold", request{Input: `{"mcpServers":{"docs":{"url":"http://example.com"}}}`, FailOn: "error"}, 0, "remote-http"},
		{"incomplete", request{Input: `{"mcpServers":{"docs":{"command":"sh"}}}`}, 2, "unassessed"},
		{"invalid", request{Input: `{`}, 2, "input-error"},
		{"suppressed", request{Input: `{"mcpServers":{"docs":{"url":"http://example.com"}}}`, Ignore: []string{"remote-http:docs"}}, 0, "command-line"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			result := scan(tc.request)
			if result.ExitCode != tc.code || !strings.Contains(result.JSON, tc.message) {
				t.Fatalf("unexpected scan: %+v", result)
			}
		})
	}
}

func TestTextAndRedaction(t *testing.T) {
	r := scan(request{Input: `{"mcpServers":{"docs":{"url":"https://example.com","headers":{"Authorization":"DO-NOT-PRINT"}}}}`})
	if r.Stdout != "-:$.mcpServers.docs.headers.Authorization: warning secret-literal: suspected literal credential\n" {
		t.Fatalf("unexpected text: %q", r.Stdout)
	}
	if strings.Contains(r.JSON+r.Stdout+r.Stderr, "DO-NOT-PRINT") {
		t.Fatal("credential value leaked")
	}
}
