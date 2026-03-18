"use client";

import { useRef, useEffect, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { json } from "@codemirror/lang-json";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";

// Retro theme matching the bragfast dashboard
const retroTheme = EditorView.theme({
  "&": {
    fontSize: "12px",
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    border: "2px solid var(--brand, #4a3728)",
    borderRadius: "0",
    backgroundColor: "var(--color-background, #fff)",
  },
  "&.cm-focused": {
    outline: "2px solid var(--brand, #4a3728)",
    outlineOffset: "-2px",
  },
  ".cm-content": {
    caretColor: "var(--brand, #4a3728)",
    padding: "8px 0",
  },
  ".cm-gutters": {
    backgroundColor: "color-mix(in srgb, var(--brand, #4a3728) 5%, transparent)",
    borderRight: "1px solid color-mix(in srgb, var(--brand, #4a3728) 15%, transparent)",
    color: "color-mix(in srgb, var(--brand, #4a3728) 40%, transparent)",
    fontSize: "10px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--brand, #4a3728) 10%, transparent)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--brand, #4a3728) 5%, transparent)",
  },
  ".cm-matchingBracket": {
    backgroundColor: "color-mix(in srgb, var(--brand, #4a3728) 20%, transparent)",
    outline: "1px solid color-mix(in srgb, var(--brand, #4a3728) 30%, transparent)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "color-mix(in srgb, var(--brand, #4a3728) 15%, transparent) !important",
  },
  ".cm-foldGutter span": {
    fontSize: "10px",
    lineHeight: "1.4",
  },
});

type JsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function JsonEditor({ value, onChange, className }: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Stable update listener
  const updateListener = useCallback(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        bracketMatching(),
        closeBrackets(),
        json(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...closeBracketsKeymap,
        ]),
        retroTheme,
        EditorView.lineWrapping,
        updateListener(),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only create editor once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (only if different from editor state)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className={className} />;
}
