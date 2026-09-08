package main

import (
	"bytes"
	"strings"

	"github.com/stefafafan/mcpeek/internal/cli"
)

type request struct {
	Input  string   `json:"input"`
	FailOn string   `json:"failOn"`
	Ignore []string `json:"ignore"`
}

type response struct {
	ExitCode int    `json:"exitCode"`
	JSON     string `json:"json"`
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
}

func scan(req request) response {
	threshold := req.FailOn
	if threshold == "" {
		threshold = "warning"
	}
	args := []string{"--fail-on", threshold}
	for _, ignore := range req.Ignore {
		args = append(args, "--ignore", ignore)
	}
	var structured, stdout, stderr bytes.Buffer
	jsonArgs := append(append([]string{}, args...), "--format=json", "-")
	code := cli.Run(jsonArgs, strings.NewReader(req.Input), &structured, &stderr, "wasm")
	stderr.Reset()
	cli.Run(append(args, "-"), strings.NewReader(req.Input), &stdout, &stderr, "wasm")
	return response{
		ExitCode: code,
		JSON:     structured.String(),
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
	}
}
