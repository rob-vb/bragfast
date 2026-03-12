"use client";

import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { CanvasTemplateConfig, TemplateObject, FormatKey, ObjectType } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS, uniqueSlug, slugify, migrateConfig } from "@/lib/templates/canvas-types";

// --- State ---
interface EditorState {
  templateId: string;
  name: string;
  config: CanvasTemplateConfig;
  activeFormat: FormatKey;
  selectedObjectId: string | null;
  isDirty: boolean;
}

// --- Actions ---
type EditorAction =
  | { type: "SELECT_OBJECT"; objectId: string | null }
  | { type: "MOVE_OBJECT"; objectId: string; x: number; y: number }
  | { type: "RESIZE_OBJECT"; objectId: string; x: number; y: number; width: number; height: number }
  | { type: "UPDATE_PROPERTY"; objectId: string; property: string; value: unknown; allFormats?: boolean }
  | { type: "ADD_OBJECT"; objectType: ObjectType }
  | { type: "REMOVE_OBJECT"; objectId: string }
  | { type: "REORDER_OBJECTS"; objectIds: string[] }
  | { type: "SWITCH_FORMAT"; format: FormatKey }
  | { type: "SET_COLORS"; colors: { background: string; text: string; primary: string } }
  | { type: "SET_BRAND"; brandId: string | undefined; previewColors?: { background: string; text: string; primary: string } }
  | { type: "SET_NAME"; name: string }
  | { type: "COMMIT_MOVE" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "MARK_SAVED" };

// --- Undo/Redo wrapper ---
interface UndoableState {
  current: EditorState;
  past: EditorState[];
  future: EditorState[];
  preDrag: EditorState | null;
}

const MAX_UNDO = 50;
const NON_UNDOABLE_ACTIONS = new Set(["SELECT_OBJECT", "SWITCH_FORMAT", "UNDO", "REDO", "MARK_SAVED"]);

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SELECT_OBJECT":
      return { ...state, selectedObjectId: action.objectId };

    case "MOVE_OBJECT": {
      const newConfig = updateObjectInActiveFormat(state, action.objectId, {
        x: action.x, y: action.y,
      });
      return { ...state, config: newConfig, isDirty: true };
    }

    case "RESIZE_OBJECT": {
      const newConfig = updateObjectInActiveFormat(state, action.objectId, {
        x: action.x, y: action.y, width: action.width, height: action.height,
      });
      return { ...state, config: newConfig, isDirty: true };
    }

    case "UPDATE_PROPERTY": {
      if (action.property === "name" && action.allFormats) {
        // Name change → regenerate ID across all formats
        const newName = action.value as string;
        const existingIds = state.config.formats[state.activeFormat].objects.map((o) => o.id);
        const newId = uniqueSlug(newName, existingIds, action.objectId);
        const newConfig = { ...state.config, formats: { ...state.config.formats } };
        for (const fmt of ["landscape", "square", "portrait"] as FormatKey[]) {
          newConfig.formats[fmt] = {
            objects: newConfig.formats[fmt].objects.map((obj) =>
              obj.id === action.objectId ? { ...obj, name: newName, id: newId } : obj
            ),
          };
        }
        const newSelectedId = state.selectedObjectId === action.objectId ? newId : state.selectedObjectId;
        return { ...state, config: newConfig, selectedObjectId: newSelectedId, isDirty: true };
      }
      if (action.allFormats) {
        // Style properties apply to all formats
        const newConfig = { ...state.config, formats: { ...state.config.formats } };
        for (const fmt of ["landscape", "square", "portrait"] as FormatKey[]) {
          newConfig.formats[fmt] = {
            objects: newConfig.formats[fmt].objects.map((obj) =>
              obj.id === action.objectId ? { ...obj, [action.property]: action.value } : obj
            ),
          };
        }
        return { ...state, config: newConfig, isDirty: true };
      }
      const newConfig = updateObjectInActiveFormat(state, action.objectId, {
        [action.property]: action.value,
      });
      return { ...state, config: newConfig, isDirty: true };
    }

    case "ADD_OBJECT": {
      const dims = FORMAT_DIMENSIONS[state.activeFormat];
      const existingIds = state.config.formats[state.activeFormat].objects.map((o) => o.id);
      const newObj: TemplateObject = createDefaultObject(action.objectType, dims.width, dims.height, existingIds);
      const maxZ = Math.max(0, ...state.config.formats[state.activeFormat].objects.map((o) => o.zIndex));
      newObj.zIndex = maxZ + 1;

      const newConfig = { ...state.config, formats: { ...state.config.formats } };
      for (const fmt of ["landscape", "square", "portrait"] as FormatKey[]) {
        const fmtDims = FORMAT_DIMENSIONS[fmt];
        const fmtObj = { ...newObj };
        // Scale position proportionally to each format
        fmtObj.x = Math.round((newObj.x / dims.width) * fmtDims.width);
        fmtObj.y = Math.round((newObj.y / dims.height) * fmtDims.height);
        fmtObj.width = Math.round((newObj.width / dims.width) * fmtDims.width);
        fmtObj.height = Math.round((newObj.height / dims.height) * fmtDims.height);
        newConfig.formats[fmt] = {
          objects: [...newConfig.formats[fmt].objects, fmtObj],
        };
      }
      return { ...state, config: newConfig, selectedObjectId: newObj.id, isDirty: true };
    }

    case "REMOVE_OBJECT": {
      const newConfig = { ...state.config, formats: { ...state.config.formats } };
      for (const fmt of ["landscape", "square", "portrait"] as FormatKey[]) {
        newConfig.formats[fmt] = {
          objects: newConfig.formats[fmt].objects.filter((o) => o.id !== action.objectId),
        };
      }
      return {
        ...state,
        config: newConfig,
        selectedObjectId: state.selectedObjectId === action.objectId ? null : state.selectedObjectId,
        isDirty: true,
      };
    }

    case "REORDER_OBJECTS": {
      // zIndex is cross-format — reorder in all formats
      const newConfig = { ...state.config, formats: { ...state.config.formats } };
      for (const fmt of ["landscape", "square", "portrait"] as FormatKey[]) {
        newConfig.formats[fmt] = {
          objects: newConfig.formats[fmt].objects.map((obj) => {
            const idx = action.objectIds.indexOf(obj.id);
            return idx >= 0 ? { ...obj, zIndex: idx } : obj;
          }),
        };
      }
      return { ...state, config: newConfig, isDirty: true };
    }

    case "SWITCH_FORMAT":
      return { ...state, activeFormat: action.format, selectedObjectId: null };

    case "SET_COLORS":
      return {
        ...state,
        config: { ...state.config, colors: action.colors, brandId: undefined },
        isDirty: true,
      };

    case "SET_BRAND":
      return {
        ...state,
        config: {
          ...state.config,
          brandId: action.brandId,
          ...(action.previewColors ? { colors: action.previewColors } : {}),
        },
        isDirty: true,
      };

    case "SET_NAME":
      return { ...state, name: action.name, isDirty: true };

    case "COMMIT_MOVE":
      // No-op on state — exists only to create an undo snapshot after drag/resize
      return { ...state };

    case "MARK_SAVED":
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

function undoableReducer(state: UndoableState, action: EditorAction): UndoableState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const prev = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      current: prev,
      future: [state.current, ...state.future],
      preDrag: null,
    };
  }
  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.current],
      current: next,
      future: state.future.slice(1),
      preDrag: null,
    };
  }

  const newCurrent = editorReducer(state.current, action);
  if (newCurrent === state.current) return state;

  // Drag/resize: capture pre-drag snapshot on first move, don't push to history
  if (action.type === "MOVE_OBJECT" || action.type === "RESIZE_OBJECT") {
    return {
      ...state,
      current: newCurrent,
      preDrag: state.preDrag ?? state.current,
    };
  }

  // Commit: push the pre-drag snapshot (not current) to history
  if (action.type === "COMMIT_MOVE") {
    if (!state.preDrag) return { ...state, current: newCurrent };
    return {
      past: [...state.past.slice(-MAX_UNDO + 1), state.preDrag],
      current: newCurrent,
      future: [],
      preDrag: null,
    };
  }

  if (NON_UNDOABLE_ACTIONS.has(action.type)) {
    return { ...state, current: newCurrent };
  }

  return {
    past: [...state.past.slice(-MAX_UNDO + 1), state.current],
    current: newCurrent,
    future: [],
    preDrag: null,
  };
}

// --- Helpers ---
function updateObjectInActiveFormat(
  state: EditorState,
  objectId: string,
  updates: Partial<TemplateObject>,
): CanvasTemplateConfig {
  const fmt = state.activeFormat;
  return {
    ...state.config,
    formats: {
      ...state.config.formats,
      [fmt]: {
        objects: state.config.formats[fmt].objects.map((obj) =>
          obj.id === objectId ? { ...obj, ...updates } : obj
        ),
      },
    },
  };
}

function createDefaultObject(type: ObjectType, canvasW: number, canvasH: number, existingIds: string[]): TemplateObject {
  const defaultNames: Record<ObjectType, string> = { text: "text", image: "image", logo: "logo" };
  const name = defaultNames[type];
  const id = uniqueSlug(name, existingIds);

  const base = {
    id,
    type,
    name,
    opacity: 1,
    zIndex: 0,
  };

  const textDefaults = {
    fontFamily: "Plus Jakarta Sans",
    fontWeight: 400,
    fontSize: 24,
    letterSpacing: 0,
    lineHeight: 1.3,
    textAlign: "left" as const,
    verticalAlign: "top" as const,
  };

  switch (type) {
    case "text":
      return { ...base, ...textDefaults, x: 48, y: canvasH * 0.6, width: canvasW - 96, height: 80, fontSize: 24 };
    case "image":
      return { ...base, x: 48, y: 96, width: canvasW - 96, height: canvasH * 0.5, imageFrame: "none" as const, objectFit: "cover" as const };
    case "logo":
      return { ...base, x: 48, y: 32, width: 120, height: 48, objectFit: "contain" as const };
  }
}

// --- Context ---
interface EditorContextValue {
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  activeObjects: TemplateObject[];
  selectedObject: TemplateObject | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}

interface EditorProviderProps {
  templateId: string;
  initialName: string;
  initialConfig: CanvasTemplateConfig;
  children: ReactNode;
}

export function EditorProvider({ templateId, initialName, initialConfig, children }: EditorProviderProps) {
  const migratedConfig = migrateConfig(initialConfig);
  const initialState: EditorState = {
    templateId,
    name: initialName,
    config: migratedConfig,
    activeFormat: "landscape",
    selectedObjectId: null,
    isDirty: false,
  };

  const [undoState, rawDispatch] = useReducer(undoableReducer, {
    current: initialState,
    past: [],
    future: [],
    preDrag: null,
  });

  const dispatch = useCallback((action: EditorAction) => rawDispatch(action), []);

  // Warn on unsaved changes
  useEffect(() => {
    if (!undoState.current.isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [undoState.current.isDirty]);

  // Keyboard shortcuts — use ref to avoid re-registering on every state change
  const stateRef = useRef(undoState.current);
  stateRef.current = undoState.current;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      const s = stateRef.current;
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }
      if (meta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
      if ((e.key === "Delete" || e.key === "Backspace") && s.selectedObjectId) {
        if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
        e.preventDefault();
        dispatch({ type: "REMOVE_OBJECT", objectId: s.selectedObjectId });
      }
      if (e.key === "Escape") {
        dispatch({ type: "SELECT_OBJECT", objectId: null });
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && s.selectedObjectId) {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        e.preventDefault();
        const obj = s.config.formats[s.activeFormat].objects.find((o) => o.id === s.selectedObjectId);
        if (!obj) return;
        const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        dispatch({ type: "MOVE_OBJECT", objectId: obj.id, x: obj.x + dx, y: obj.y + dy });
        dispatch({ type: "COMMIT_MOVE" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  const state = undoState.current;
  const activeObjects = state.config.formats[state.activeFormat].objects;
  const selectedObject = activeObjects.find((o) => o.id === state.selectedObjectId) ?? null;

  return (
    <EditorContext.Provider value={{
      state,
      dispatch,
      canUndo: undoState.past.length > 0,
      canRedo: undoState.future.length > 0,
      activeObjects,
      selectedObject,
    }}>
      {children}
    </EditorContext.Provider>
  );
}
