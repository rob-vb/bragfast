"use client";

import {
  useReducer,
  useEffect,
  useState,
  useRef,
  useMemo,
  useDeferredValue,
} from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { KitchenScene3D } from "@/components/kitchen/kitchen-scene-3d";
import { RecipeStep, type TemplateItem } from "@/components/kitchen/recipe-step";
import { SeasoningStep } from "@/components/kitchen/seasoning-step";
import { IngredientsStep } from "@/components/kitchen/ingredients-step";
import { PlatingStep } from "@/components/kitchen/plating-step";
import { CookResults } from "@/components/kitchen/cook-results";
import { TemplatePreview } from "@/components/kitchen/template-preview";
import { RightPanelResult } from "@/components/kitchen/right-panel-result";
import { SaveDraftDialog } from "@/components/kitchen/save-draft-dialog";
import { ApproveDraftModal } from "@/components/admin/approve-draft-modal";
import { useUserId } from "@/hooks/use-user-id";
import { buildDraftObjectData } from "@/lib/preview-sample";
import type { CanvasTemplateConfig, FormatKey } from "@/lib/templates/canvas-types";
import type {
  AnimationPreset,
  ObjectModification,
  ReleaseResult,
  FormatEntry,
  Brand,
} from "@/lib/types";
import type { DraftConfig, DraftObjectContent } from "@/lib/drafts/types";

// ─── State ────────────────────────────────────────────────────────────────────

interface CookState {
  templateId: string | null;
  templateConfig: CanvasTemplateConfig | null;
  brandId?: string;
  colors: { background: string; text: string; primary: string };
  objectContent: Record<string, ObjectModification>;
  formats: FormatKey[];
  outputType: "image" | "video";
  animationPreset?: AnimationPreset;
  autoSelectedPreset?: AnimationPreset;
  status: "idle" | "cooking" | "done" | "error";
  cookId?: string;
  progress?: number;
  results?: ReleaseResult;
  error?: string;
  draftName: string;
}

const DEFAULT_COLORS = { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" };

function templateHasHero(config: CanvasTemplateConfig | null): boolean {
  if (!config) return false;
  for (const layout of Object.values(config.formats)) {
    if (layout?.objects.some((o) => o.type === "visual")) return true;
  }
  return false;
}

const INITIAL_STATE: CookState = {
  templateId: null,
  templateConfig: null,
  colors: DEFAULT_COLORS,
  objectContent: {},
  formats: ["landscape", "square", "portrait"],
  outputType: "image",
  status: "idle",
  draftName: "",
};

/** Returns "idle" when state is "done" so any user edit cancels result view. */
function resumeFromDone(status: CookState["status"]): CookState["status"] {
  return status === "done" ? "idle" : status;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type CookAction =
  | { type: "SELECT_TEMPLATE"; templateId: string; config: CanvasTemplateConfig }
  | {
      type: "SET_BRAND";
      brandId: string | undefined;
      colors: { background: string; text: string; primary: string };
    }
  | { type: "SET_COLORS"; colors: { background: string; text: string; primary: string } }
  | { type: "SET_CONTENT"; id: string; mod: ObjectModification }
  | { type: "TOGGLE_FORMAT"; format: FormatKey }
  | { type: "SET_OUTPUT_TYPE"; outputType: "image" | "video" }
  | { type: "SET_ANIMATION_PRESET"; preset: AnimationPreset | undefined }
  | { type: "START_COOK" }
  | { type: "SET_COOK_ID"; cookId: string }
  | { type: "SET_PROGRESS"; progress: number }
  | { type: "COOK_DONE"; results: ReleaseResult }
  | { type: "COOK_ERROR"; error: string }
  | { type: "HYDRATE"; patch: Partial<CookState> }
  | { type: "RESET" };

function cookReducer(state: CookState, action: CookAction): CookState {
  switch (action.type) {
    case "SELECT_TEMPLATE": {
      const preset = action.config.animation_preset ?? "showcase";
      return {
        ...state,
        templateId: action.templateId,
        templateConfig: action.config,
        // Seed colors from template if no brand selected
        colors: state.brandId
          ? state.colors
          : { ...DEFAULT_COLORS, ...action.config.colors },
        objectContent: {},
        animationPreset: preset,
        autoSelectedPreset: preset,
        status: resumeFromDone(state.status),
      };
    }

    case "SET_BRAND":
      return {
        ...state,
        brandId: action.brandId,
        colors: action.colors,
        status: resumeFromDone(state.status),
      };

    case "SET_COLORS":
      return { ...state, colors: action.colors, status: resumeFromDone(state.status) };

    case "SET_CONTENT":
      return {
        ...state,
        objectContent: { ...state.objectContent, [action.id]: action.mod },
        status: resumeFromDone(state.status),
      };

    case "TOGGLE_FORMAT": {
      const has = state.formats.includes(action.format);
      // Don't allow deselecting the last format
      if (has && state.formats.length === 1) return state;
      return {
        ...state,
        formats: has
          ? state.formats.filter((f) => f !== action.format)
          : [...state.formats, action.format],
        status: resumeFromDone(state.status),
      };
    }

    case "SET_OUTPUT_TYPE": {
      const status = resumeFromDone(state.status);
      if (action.outputType === "image") {
        return {
          ...state,
          outputType: "image",
          animationPreset: undefined,
          autoSelectedPreset: undefined,
          status,
        };
      }
      if (state.animationPreset) {
        return { ...state, outputType: "video", status };
      }
      const seeded = state.templateConfig?.animation_preset ?? "showcase";
      return {
        ...state,
        outputType: "video",
        animationPreset: seeded,
        autoSelectedPreset: seeded,
        status,
      };
    }

    case "SET_ANIMATION_PRESET":
      return {
        ...state,
        animationPreset: action.preset,
        autoSelectedPreset: undefined,
        status: resumeFromDone(state.status),
      };

    case "START_COOK":
      // Clear cookId so useReleaseProgress doesn't match the previous
      // completed release and immediately re-dispatch stale results before
      // the new cook's id arrives from the POST response.
      return {
        ...state,
        status: "cooking",
        cookId: undefined,
        progress: undefined,
        results: undefined,
        error: undefined,
      };

    case "SET_COOK_ID":
      return { ...state, cookId: action.cookId };

    case "SET_PROGRESS":
      return { ...state, progress: action.progress };

    case "COOK_DONE":
      return { ...state, status: "done", results: action.results };

    case "COOK_ERROR":
      return { ...state, status: "error", error: action.error };

    case "HYDRATE":
      return { ...state, ...action.patch };

    case "RESET":
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CookPageProps {
  templates: TemplateItem[];
}

export function CookPage({ templates }: CookPageProps) {
  const [state, dispatch] = useReducer(cookReducer, INITIAL_STATE);
  const userId = useUserId();
  const searchParams = useSearchParams();
  const draftParam = searchParams.get("draft");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftCopyByPlatform, setDraftCopyByPlatform] = useState<
    DraftConfig["copyByPlatform"] | undefined
  >(undefined);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftMissingTemplate, setDraftMissingTemplate] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const hydratedDraftRef = useRef<string | null>(null);
  const initialTemplateRef = useRef(false);

  // Right-panel preview tab state — defaults to first checked format.
  const [activePreviewFormat, setActivePreviewFormat] = useState<FormatKey>("landscape");

  const hasTemplate = !!state.templateId;
  const canCook = hasTemplate && state.formats.length > 0 && state.status !== "cooking";

  // ── Live credit balance ─────────────────────────────────────────────────
  const creditBalance = useQuery(api.userProfiles.getBalance, { userId });
  const userStats = useQuery(api.userProfiles.getStats, { userId });

  // ── Approve flow: integrations + routing defaults ──────────────────────
  const integrations = useQuery(api.integrationSecrets.listByUser, { userId });
  const routingRows = useQuery(api.routingDefaults.listByUser, { userId });

  const sendEnabled =
    (integrations?.some((r) => r.provider === "buffer" && r.enabled) ?? false) ||
    (integrations?.some((r) => r.provider === "postiz" && r.enabled) ?? false);

  // ── User brands (for both template thumbnails and live preview) ─────────
  const userBrandsRaw = useQuery(api.brands.listByUser, { userId });
  const primaryBrand: Brand | undefined = userBrandsRaw?.[0]
    ? {
        name: userBrandsRaw[0].name,
        logoBase64: userBrandsRaw[0].logo_url ?? "",
        website: userBrandsRaw[0].website ?? "",
        colors: userBrandsRaw[0].colors,
        font_family: userBrandsRaw[0].font_family,
      }
    : undefined;

  // Brand used for the live right-panel preview — reflects the picked brand
  // (or current colors when no brand) so the canvas matches what will cook.
  const previewBrand: Brand = useMemo(() => {
    if (state.brandId) {
      const raw = userBrandsRaw?.find((b) => b.externalId === state.brandId);
      if (raw) {
        return {
          name: raw.name,
          logoBase64: raw.logo_url ?? "",
          website: raw.website ?? "",
          colors: raw.colors,
          font_family: raw.font_family,
        };
      }
    }
    return { name: "", logoBase64: "", website: "", colors: state.colors };
  }, [state.brandId, state.colors, userBrandsRaw]);

  // ── Auto-select first template on mount (no draft path) ────────────────
  useEffect(() => {
    if (initialTemplateRef.current) return;
    if (draftParam) return; // draft hydration owns selection
    if (templates.length === 0) return;
    if (state.templateId) return;
    const first = templates[0];
    initialTemplateRef.current = true;
    dispatch({ type: "SELECT_TEMPLATE", templateId: first.id, config: first.config });
  }, [draftParam, templates, state.templateId]);

  // ── Draft hydration (runs once when templates load) ─────────────────────
  useEffect(() => {
    if (!draftParam) return;
    if (hydratedDraftRef.current === draftParam) return;
    if (templates.length === 0) return;
    hydratedDraftRef.current = draftParam;

    let cancelled = false;
    setDraftLoading(true);
    setDraftError(null);
    (async () => {
      try {
        const res = await fetch(`/api/v1/drafts/${encodeURIComponent(draftParam)}`);
        if (!res.ok) {
          if (res.status === 404) {
            const url = new URL(window.location.href);
            url.searchParams.delete("draft");
            window.history.replaceState({}, "", url.toString());
            return;
          }
          setDraftError("Failed to load draft.");
          return;
        }
        const data: { id: string; name: string | null; config: DraftConfig } = await res.json();
        if (cancelled) return;

        const cfg = data.config;

        if (cfg.templateId) {
          const match = templates.find((t) => t.id === cfg.templateId);
          if (match) {
            dispatch({ type: "SELECT_TEMPLATE", templateId: match.id, config: match.config });
          } else {
            setDraftMissingTemplate(cfg.templateId);
          }
        }

        const patch: Partial<CookState> = {};
        if (cfg.brandId) patch.brandId = cfg.brandId;
        if (cfg.colors) patch.colors = cfg.colors;
        if (cfg.formats && cfg.formats.length > 0) patch.formats = cfg.formats;
        if (cfg.output) patch.outputType = cfg.output;
        if (cfg.video?.preset) patch.animationPreset = cfg.video.preset;
        if (cfg.objectContent) {
          patch.objectContent = Object.fromEntries(
            Object.entries(cfg.objectContent).map(([id, entry]) => [id, { id, ...entry }]),
          );
        }
        if (data.name) patch.draftName = data.name;

        if (Object.keys(patch).length > 0) {
          dispatch({ type: "HYDRATE", patch });
        }

        setDraftId(draftParam);
        setDraftCopyByPlatform(cfg.copyByPlatform);
      } catch (err) {
        console.error("Draft hydration failed", err);
        if (!cancelled) setDraftError("Failed to load draft.");
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      hydratedDraftRef.current = null;
    };
  }, [draftParam, templates]);

  // ── Real-time release progress via Convex subscription ──────────────────
  const releaseDoc = useQuery(
    api.releases.getByExternalId,
    state.cookId ? { externalId: state.cookId } : "skip",
  );
  const releaseStatus = releaseDoc?.status;
  const releaseProgressPct = releaseDoc?.progress;
  const fetchingResultRef = useRef(false);

  useEffect(() => {
    if (!releaseStatus || state.status !== "cooking") return;

    if (releaseStatus === "completed" && !fetchingResultRef.current) {
      fetchingResultRef.current = true;
      fetch(`/api/v1/cook/${state.cookId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: ReleaseResult) => dispatch({ type: "COOK_DONE", results: data }))
        .catch(() => dispatch({ type: "COOK_ERROR", error: "Failed to load results." }))
        .finally(() => {
          fetchingResultRef.current = false;
        });
    } else if (releaseStatus === "failed") {
      dispatch({ type: "COOK_ERROR", error: "Generation failed. Try again." });
    } else if (releaseProgressPct != null) {
      dispatch({ type: "SET_PROGRESS", progress: releaseProgressPct });
    }
  }, [releaseStatus, releaseProgressPct, state.status, state.cookId]);

  // Materialize a draft from current Kitchen state on demand.
  const createUserDraft = useMutation(api.drafts.createUserDraft);
  const [creatingDraft, setCreatingDraft] = useState(false);
  async function handleOpenSend() {
    if (draftId) {
      setApproveOpen(true);
      return;
    }
    if (!state.templateId) return;
    setCreatingDraft(true);
    try {
      const config: DraftConfig = {
        output: state.outputType,
        templateId: state.templateId,
        ...(state.brandId ? { brandId: state.brandId } : { colors: state.colors }),
        formats: state.formats,
        objectContent: state.objectContent,
        ...(state.animationPreset ? { video: { preset: state.animationPreset } } : {}),
      };
      const texts = Object.values(state.objectContent)
        .map((m) => m.text)
        .filter((t): t is string => !!t);
      const name = (texts[0] ?? "Untitled draft").slice(0, 80);
      const result = await createUserDraft({
        name,
        config: JSON.stringify(config),
      });
      setDraftId(result.id);
      setApproveOpen(true);
    } catch (err) {
      console.error("[cook-page] createUserDraft failed:", err);
    } finally {
      setCreatingDraft(false);
    }
  }

  // Safety timeout
  useEffect(() => {
    if (state.status !== "cooking" || !state.cookId) return;
    const timeout = setTimeout(
      () => {
        dispatch({
          type: "COOK_ERROR",
          error: "Taking longer than expected. Check History for your results.",
        });
      },
      5 * 60 * 1000,
    );
    return () => clearTimeout(timeout);
  }, [state.status, state.cookId]);

  // ── Cook ─────────────────────────────────────────────────────────────────
  async function handleCook() {
    if (!canCook || !state.templateId) return;

    const objects = Object.values(state.objectContent).filter((m) => {
      return m.text || m.image_url || m.video_url || m.font_family || m.font_weight;
    });

    const formats: FormatEntry[] = state.formats.map((fmt) => ({
      name: fmt,
      slides: [{ objects: objects.length > 0 ? objects : undefined }],
    }));

    const body: Record<string, unknown> = {
      template: state.templateId,
      formats,
      ...(state.brandId ? { brand_id: state.brandId } : { colors: state.colors }),
      ...(draftId ? { draft_id: draftId } : {}),
      source: "dashboard",
    };

    if (state.outputType === "video") {
      body.video = state.animationPreset ? { preset: state.animationPreset } : true;
    }

    fetchingResultRef.current = false;
    dispatch({ type: "START_COOK" });

    try {
      const endpoint = state.outputType === "video" ? "/api/v1/cook/video" : "/api/v1/cook/image";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const data = await res.json();
        if (data.credits_needed) {
          dispatch({
            type: "COOK_ERROR",
            error: `Not enough credits (need ${data.credits_needed}). Upgrade your plan.`,
          });
        } else {
          dispatch({ type: "COOK_ERROR", error: "Too many requests. Slow down." });
        }
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        dispatch({
          type: "COOK_ERROR",
          error: data.error ?? "Something burned. Try again.",
        });
        return;
      }

      const data: ReleaseResult = await res.json();
      dispatch({ type: "SET_COOK_ID", cookId: data.cook_id });
    } catch {
      dispatch({ type: "COOK_ERROR", error: "Network error. Check connection and try again." });
    }
  }

  // ── Save draft ───────────────────────────────────────────────────────────
  async function handleSaveDraft(name: string) {
    const objectContent: Record<string, DraftObjectContent> = {};
    for (const [id, mod] of Object.entries(state.objectContent)) {
      const entry: DraftObjectContent = {};
      if (mod.text) entry.text = mod.text;
      if (mod.image_url) entry.image_url = mod.image_url;
      if (mod.video_url) entry.video_url = mod.video_url;
      if (mod.font_family) entry.font_family = mod.font_family;
      if (mod.font_weight) entry.font_weight = mod.font_weight;
      if (Object.keys(entry).length > 0) objectContent[id] = entry;
    }

    const payload: Record<string, unknown> = { output: state.outputType };
    if (name) payload.name = name;
    if (state.templateId) payload.templateId = state.templateId;
    if (state.brandId) payload.brandId = state.brandId;
    else payload.colors = state.colors;
    if (state.formats.length > 0) payload.formats = state.formats;
    if (Object.keys(objectContent).length > 0) payload.objectContent = objectContent;
    if (state.outputType === "video" && state.animationPreset) {
      payload.video = { preset: state.animationPreset };
    }

    const res = await fetch("/api/v1/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to save draft");
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  }

  // ── Live preview wiring ─────────────────────────────────────────────────
  const deferredObjectContent = useDeferredValue(state.objectContent);
  const effectivePreviewFormat: FormatKey = state.formats.includes(activePreviewFormat)
    ? activePreviewFormat
    : (state.formats[0] ?? "landscape");

  // Sync activePreviewFormat back when it falls out of the checked list.
  useEffect(() => {
    if (!state.formats.includes(activePreviewFormat) && state.formats.length > 0) {
      setActivePreviewFormat(state.formats[0]);
    }
  }, [state.formats, activePreviewFormat]);

  const previewObjectData = useMemo(() => {
    if (!state.templateConfig) return undefined;
    return buildDraftObjectData(
      state.templateConfig,
      deferredObjectContent,
      effectivePreviewFormat,
      { placeholderForEmpty: true },
    );
  }, [state.templateConfig, deferredObjectContent, effectivePreviewFormat]);

  // Cooking progress label for the COOK button when busy
  const cookButtonContent = (() => {
    if (state.status === "cooking") {
      const pct = state.progress ?? 0;
      return <span>{pct > 0 ? `COOKING ${pct}%` : "COOKING…"}</span>;
    }
    if (state.status === "error") return <span>TRY AGAIN</span>;
    return (
      <span className="inline-flex items-center gap-2">
        <span>COOK</span>
        <svg
          aria-hidden
          viewBox="0 0 6 8"
          className="h-2 w-[6px] fill-current"
        >
          <path d="M0 0 L6 4 L0 8 Z" />
        </svg>
      </span>
    );
  })();

  const draftName = state.draftName || "Untitled draft";
  const creditCost = state.formats.length * (state.outputType === "video" ? 5 : 1);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="-mt-8 -mx-4 md:-mx-8">
      <HeaderSlot>
        <span className="font-[family-name:var(--font-press-start)] text-xs text-brand">
          KITCHEN
        </span>
        <span className="text-brand/20" aria-hidden="true">|</span>
        <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60 truncate min-w-0">
          {draftName}
        </span>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          {creditBalance !== undefined && (
            <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/50">
              {creditBalance} credits
            </span>
          )}
          <button
            type="button"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!hasTemplate}
            className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-white text-brand hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save Draft
          </button>
          {state.status === "done" && (
            <button
              type="button"
              onClick={() => dispatch({ type: "RESET" })}
              className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-white text-brand hover:bg-gold/20 transition-colors"
            >
              Start Over
            </button>
          )}
          <button
            type="button"
            onClick={
              state.status === "error"
                ? () => dispatch({ type: "RESET" })
                : handleCook
            }
            disabled={!canCook && state.status !== "error"}
            aria-disabled={state.status === "cooking"}
            aria-label={`Cook — ${creditCost} credits`}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-2 border-2 border-brand bg-gold text-brand shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
          >
            {cookButtonContent}
          </button>
        </div>
      </HeaderSlot>

      {/* Two-panel grid */}
      <div className="lg:grid lg:grid-cols-[420px_1fr]">
        {/* Left panel */}
        <div className="px-4 md:px-8 py-6 space-y-8 border-r-2 border-brand/10">
          {/* Draft banners */}
          {draftLoading && (
            <div className="border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton px-4 py-3">
              <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
                Loading draft…
              </p>
            </div>
          )}
          {draftError && (
            <div className="border-2 border-red-500 bg-red-50 px-4 py-3">
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-red-700">
                {draftError}
              </p>
            </div>
          )}
          {draftMissingTemplate && (
            <div className="border-2 border-brand bg-gold/20 px-4 py-3 shadow-[3px_3px_0_var(--color-brand)]">
              <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand mb-1 uppercase">
                ▸ Heads up
              </p>
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/80">
                Draft referenced template{" "}
                <code className="font-[family-name:var(--font-geist-mono)]">
                  {draftMissingTemplate}
                </code>{" "}
                which no longer exists. Pick a new one below.
              </p>
            </div>
          )}
          {saveSuccess && (
            <div className="border-2 border-brand bg-white px-4 py-3 shadow-[3px_3px_0_var(--color-brand)]">
              <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase">
                ✓ Draft saved
              </p>
            </div>
          )}

          {/* 1. Template */}
          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase">
              1. Template
            </h2>
            <RecipeStep
              templates={templates}
              selectedId={state.templateId}
              onSelect={(id, config) =>
                dispatch({ type: "SELECT_TEMPLATE", templateId: id, config })
              }
              userBrand={primaryBrand}
            />
          </section>

          {/* 2. Brand */}
          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase">
              2. Brand
            </h2>
            <SeasoningStep
              brandId={state.brandId}
              colors={state.colors}
              onBrandChange={(brandId, colors) =>
                dispatch({ type: "SET_BRAND", brandId, colors })
              }
              onColorsChange={(colors) => dispatch({ type: "SET_COLORS", colors })}
            />
          </section>

          {/* 3. Content */}
          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase">
              3. Content
            </h2>
            {state.templateConfig ? (
              <IngredientsStep
                templateConfig={state.templateConfig}
                objectContent={state.objectContent}
                outputType={state.outputType}
                onContentChange={(id, mod) => dispatch({ type: "SET_CONTENT", id, mod })}
              />
            ) : (
              <p className="text-xs font-[family-name:var(--font-geist-sans)] text-brand/50">
                Select a template to see content fields.
              </p>
            )}
          </section>

          {/* 4. Output */}
          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase">
              4. Output
            </h2>
            <div className="inline-flex border-2 border-brand">
              {(["image", "video"] as const).map((type) => {
                const active = state.outputType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => dispatch({ type: "SET_OUTPUT_TYPE", outputType: type })}
                    className={`
                      font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 capitalize
                      transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                      ${active ? "bg-gold text-brand" : "bg-white text-brand/50 hover:text-brand hover:bg-gold/20"}
                    `}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            <PlatingStep
              formats={state.formats}
              outputType={state.outputType}
              animationPreset={state.animationPreset}
              creditBalance={creditBalance ?? undefined}
              autoSelectedPreset={state.autoSelectedPreset}
              selectedVideoHasHero={templateHasHero(state.templateConfig)}
              templateConfig={state.templateConfig ?? undefined}
              onToggleFormat={(fmt) => dispatch({ type: "TOGGLE_FORMAT", format: fmt })}
              onAnimationPresetChange={(p) =>
                dispatch({ type: "SET_ANIMATION_PRESET", preset: p })
              }
            />
          </section>

          {/* Inline error banner (when not in result panel) */}
          {state.status === "error" && state.error && (
            <div role="alert" aria-live="assertive" className="border-2 border-red-500 bg-red-50 px-4 py-3">
              <p className="text-xs font-[family-name:var(--font-geist-sans)] text-red-700">
                {state.error}
              </p>
            </div>
          )}
        </div>

        {/* Right panel — desktop sticky preview */}
        <div className="hidden lg:flex sticky top-14 self-start h-[calc(100vh-56px)] flex-col relative overflow-hidden">
          {state.status === "cooking" && (
            <div
              role="status"
              aria-busy="true"
              aria-label="Cooking your images..."
              className="flex-1 min-h-0 p-6 flex items-center justify-center"
            >
              <div
                className="w-full"
                style={{ maxWidth: "calc((100vh - 56px - 48px) * 2)" }}
              >
                <KitchenScene3D activeStep={null} status="cooking" />
              </div>
            </div>
          )}

          {state.status !== "done" && state.status !== "cooking" && state.templateConfig && (
            <>
              {/* Format tabs — always visible; disabled when format is unchecked */}
              <div role="tablist" className="flex border-b-2 border-brand/10 px-4 pt-3 gap-1">
                {(["landscape", "square", "portrait"] as const).map((fmt) => {
                  const enabled = state.formats.includes(fmt);
                  const isActive = enabled && effectivePreviewFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      role="tab"
                      aria-selected={isActive}
                      aria-disabled={!enabled}
                      type="button"
                      onClick={() => enabled && setActivePreviewFormat(fmt)}
                      tabIndex={enabled ? 0 : -1}
                      className={`
                        font-[family-name:var(--font-press-start)] text-[10px] px-4 min-h-[40px]
                        border-2 -mb-[2px]
                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                        transition-colors
                        ${isActive
                          ? "bg-gold text-brand border-brand shadow-[2px_2px_0_var(--color-brand)]"
                          : enabled
                            ? "bg-white text-brand/70 border-brand/30 hover:bg-gold/20 hover:text-brand"
                            : "bg-transparent text-brand/25 border-brand/10 cursor-not-allowed"
                        }
                      `}
                    >
                      {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                    </button>
                  );
                })}
              </div>

              {/* Live canvas */}
              <div role="tabpanel" className="flex-1 p-6 bg-surface flex items-center justify-center min-h-0">
                <PreviewFrame format={effectivePreviewFormat}>
                  <TemplatePreview
                    config={state.templateConfig}
                    brand={previewBrand}
                    format={effectivePreviewFormat}
                    objectData={previewObjectData}
                    watermark
                  />
                </PreviewFrame>
              </div>
            </>
          )}

          {state.status === "done" && state.results && (
            <RightPanelResult
              result={state.results}
              initialFormat={effectivePreviewFormat}
              onSend={handleOpenSend}
              sendEnabled={sendEnabled && !creatingDraft}
            />
          )}

        </div>

        {/* Mobile sticky preview — appears above the form on small screens */}
        {state.templateConfig && (
          <div
            className="sticky top-14 z-10 lg:hidden bg-surface border-b-2 border-brand/10"
            style={{ maxHeight: "40vh" }}
          >
            <div className="px-4 py-2 flex gap-1 overflow-x-auto">
              {state.formats.map((fmt) => {
                const isActive = effectivePreviewFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setActivePreviewFormat(fmt)}
                    className={`
                      font-[family-name:var(--font-press-start)] text-[10px] px-3 min-h-[44px]
                      border-2 border-brand
                      ${isActive ? "bg-gold text-brand" : "bg-white text-brand/60 border-brand/30"}
                    `}
                  >
                    {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                  </button>
                );
              })}
            </div>
            <div className="p-3 flex items-center justify-center" style={{ maxHeight: "32vh" }}>
              <PreviewFrame format={effectivePreviewFormat} mobileTight>
                {state.status === "done" && state.results ? (
                  <CookResults result={state.results} />
                ) : (
                  <TemplatePreview
                    config={state.templateConfig}
                    brand={previewBrand}
                    format={effectivePreviewFormat}
                    objectData={previewObjectData}
                  />
                )}
              </PreviewFrame>
            </div>
          </div>
        )}
      </div>

      <SaveDraftDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveDraft}
        defaultName={state.draftName}
      />

      {approveOpen && draftId && (() => {
        const texts = Object.values(state.objectContent)
          .map((m) => m.text)
          .filter((t): t is string => !!t);
        const title = (texts[0] ?? "Untitled draft").slice(0, 80);
        const description = (texts[1] ?? "").slice(0, 220);
        const draftFormats =
          state.outputType === "video"
            ? state.formats.map((f) => `video-${f}` as const)
            : state.formats;
        return (
          <ApproveDraftModal
            draftId={draftId}
            initialTitle={title}
            initialDescription={description}
            initialCopyByPlatform={draftCopyByPlatform}
            draftFormats={draftFormats}
            routingRows={routingRows ?? []}
            integrations={integrations ?? []}
            plan={userStats?.plan}
            onClose={() => setApproveOpen(false)}
          />
        );
      })()}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORMAT_ASPECT: Record<FormatKey, string> = {
  landscape: "16 / 9",
  square: "1 / 1",
  portrait: "4 / 5",
};

const FORMAT_RATIO: Record<FormatKey, number> = {
  landscape: 16 / 9,
  square: 1,
  portrait: 4 / 5,
};

/** Portals workspace controls into the admin layout's <header> slot. */
function HeaderSlot({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTarget(document.getElementById("admin-header-slot"));
  }, []);
  if (!target) return null;
  return createPortal(children, target);
}

/** Wraps the live preview in an aspect-ratio frame so TemplatePreview's
 *  ResizeObserver-driven scale picks the right dimension. The width is
 *  computed from the height cap so portrait/square don't get squashed when
 *  the parent is wider than tall. */
function PreviewFrame({
  format,
  mobileTight,
  children,
}: {
  format: FormatKey;
  mobileTight?: boolean;
  children: React.ReactNode;
}) {
  const heightCap = mobileTight ? "30vh" : "calc(100vh - 140px)";
  const ratio = FORMAT_RATIO[format];
  return (
    <div
      className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]"
      style={{
        aspectRatio: FORMAT_ASPECT[format],
        // Width is the smaller of: full parent width, or the height-cap × ratio.
        // This keeps the aspect ratio honest whether height or width is the binding constraint.
        width: `min(100%, calc(${heightCap} * ${ratio}))`,
        maxWidth: mobileTight ? "100%" : "48rem",
        maxHeight: heightCap,
      }}
    >
      {children}
    </div>
  );
}
