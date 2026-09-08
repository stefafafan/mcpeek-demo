import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef } from "react";
import { json } from "@codemirror/lang-json";
import { Decoration, EditorView } from "@codemirror/view";
import {
  HighlightStyle,
  syntaxHighlighting,
  unfoldAll,
} from "@codemirror/language";
import { findingLocation } from "./findingLocation";
import { tags } from "@lezer/highlight";

const theme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#191c20",
      color: "#e1e5e9",
      height: "100%",
      fontSize: "13px",
    },
    ".cm-scroller": {
      fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
      lineHeight: "1.85",
      overflow: "auto",
    },
    ".cm-content": { padding: "20px 0", caretColor: "#a4e9cc" },
    ".cm-line": { padding: "0 20px 0 12px" },
    ".cm-gutters": {
      backgroundColor: "#191c20",
      color: "#676e78",
      border: "none",
      padding: "20px 0 20px 12px",
      minWidth: "40px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#bec7d0",
    },
    ".cm-activeLine": { backgroundColor: "#ffffff04" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#344d47",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-cursor": { borderLeftColor: "#a4e9cc" },
    ".cm-matchingBracket": {
      backgroundColor: "#455b53 !important",
      color: "#e5fff3 !important",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "#30363b",
      color: "#9ecfbc",
      border: "none",
    },
  },
  { dark: true },
);

const highlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.propertyName, color: "#a9c6ec" },
    { tag: tags.string, color: "#b6dfbc" },
    { tag: tags.number, color: "#eab985" },
    { tag: [tags.bool, tags.null], color: "#d4b1e9" },
    {
      tag: [tags.brace, tags.squareBracket, tags.punctuation],
      color: "#9da8b6",
    },
  ]),
);

const extensions = [
  json(),
  theme,
  highlight,
  EditorView.lineWrapping,
  EditorView.contentAttributes.of({
    "aria-label": "MCP configuration",
    spellcheck: "false",
  }),
];

export default function Editor({
  value,
  onChange,
  highlightPath,
}: {
  value: string;
  onChange: (value: string) => void;
  highlightPath: { path: string } | null;
}) {
  const editor = useRef<ReactCodeMirrorRef>(null);
  const location = useMemo(
    () => (highlightPath ? findingLocation(value, highlightPath.path) : null),
    [value, highlightPath],
  );
  const editorExtensions = useMemo(() => {
    const lines = [];
    if (location) {
      let start = value.lastIndexOf("\n", location.from - 1) + 1;
      while (start < location.to) {
        lines.push(Decoration.line({ class: "cm-finding-line" }).range(start));
        const end = value.indexOf("\n", start);
        if (end === -1) {
          break;
        }
        start = end + 1;
      }
    }
    return [...extensions, EditorView.decorations.of(Decoration.set(lines))];
  }, [value, location]);

  useEffect(() => {
    const view = editor.current?.view;
    if (!view || !location) {
      return;
    }
    unfoldAll(view);
    view.dispatch({
      selection: { anchor: location.from },
      effects: EditorView.scrollIntoView(location.from, { y: "center" }),
    });
    view.dom.scrollIntoView({ block: "nearest" });
  }, [location]);

  return (
    <CodeMirror
      ref={editor}
      value={value}
      onChange={onChange}
      extensions={editorExtensions}
      theme="none"
      height="100%"
      basicSetup={{
        foldGutter: true,
        highlightActiveLine: true,
        autocompletion: false,
      }}
    />
  );
}
