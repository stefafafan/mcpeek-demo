//go:build js && wasm

package main

import (
	"encoding/json"
	"syscall/js"
)

func main() {
	run := js.FuncOf(func(this js.Value, args []js.Value) any {
		var req request
		if len(args) != 1 || json.Unmarshal([]byte(args[0].String()), &req) != nil {
			return `{"exitCode":2,"json":"","stdout":"","stderr":"Invalid scan request"}`
		}
		data, err := json.Marshal(scan(req))
		if err != nil {
			return `{"exitCode":2,"json":"","stdout":"","stderr":"Cannot encode scan result"}`
		}
		return string(data)
	})
	js.Global().Set("mcpeekRun", run)
	js.Global().Call("mcpeekReady")
	select {}
}
