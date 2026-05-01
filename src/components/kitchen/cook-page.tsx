"use client";

import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { KitchenScene3D } from "@/components/kitchen/kitchen-scene-3d";
import { CookSection } from "@/components/ui/cook-section";
import type { CookStep } from "@/components/kitchen/kitchen-animation-state";
import { RecipeStep, type TemplateItem } from "@/components/kitchen/recipe-step";
import { SeasoningStep } from "@/components/kitchen/seasoning-step";
import { IngredientsStep } from "@/components/kitchen/ingredients-step";
import { PlatingStep } from "@/components/kitchen/plating-step";
import { CookButton } from "@/components/kitchen/cook-button";
import { CookResults } from "@/components/kitchen/cook-results";
import { SaveDraftDialog } from "@/components/kitchen/save-draft-dialog";
import { ApproveDraftModal } from "@/components/admin/approve-draft-modal";
import { useUserId } from "@/hooks/use-user-id";
import type { CanvasTemplateConfig, FormatKey } from "@/lib/templates/canvas-types";
import type { AnimationPreset, ObjectModification, ReleaseResult, FormatEntry, Brand } from "@/lib/types";
import type { DraftConfig } from "@/lib/drafts/types";

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
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type CookAction =
  | { type: "SELECT_TEMPLATE"; templateId: string; config: CanvasTemplateConfig }
  | { type: "SET_BRAND"; brandId: string | undefined; colors: { background: string; text: string; primary: string } }
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
      };
    }

    case "SET_BRAND":
      return {
        ...state,
        brandId: action.brandId,
        colors: action.colors,
      };

    case "SET_COLORS":
      return { ...state, colors: action.colors };

    case "SET_CONTENT":
      return {
        ...state,
        objectContent: { ...state.objectContent, [action.id]: action.mod },
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
      };
    }

    case "SET_OUTPUT_TYPE": {
      if (action.outputType === "image") {
        return {
          ...state,
          outputType: "image",
          animationPreset: undefined,
          autoSelectedPreset: undefined,
        };
      }
      if (state.animationPreset) {
        return { ...state, outputType: "video" };
      }
      const seeded = state.templateConfig?.animation_preset ?? "showcase";
      return {
        ...state,
        outputType: "video",
        animationPreset: seeded,
        autoSelectedPreset: seeded,
      };
    }

    case "SET_ANIMATION_PRESET":
      return { ...state, animationPreset: action.preset, autoSelectedPreset: undefined };

    case "START_COOK":
      // Clear cookId so useReleaseProgress doesn't match the previous
      // completed release and immediately re-dispatch stale results before
      // the new cook's id arrives from the POST response.
      return { ...state, status: "cooking", cookId: undefined, progress: undefined, results: undefined, error: undefined };

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
  const autoApprovedCookRef = useRef<string | null>(null);

  // Progressive disclosure
  const hasTemplate = !!state.templateId;
  const hasContent = hasTemplate; // unlock after template selected
  const hasPlating = hasTemplate;
  const canCook = hasTemplate && state.formats.length > 0 && state.status !== "cooking";

  // ── Live credit balance ─────────────────────────────────────────────────
  const creditBalance = useQuery(api.userProfiles.getBalance, { userId });
  const userStats = useQuery(api.userProfiles.getStats, { userId });

  // ── Approve flow: integrations + routing defaults ──────────────────────
  const integrations = useQuery(api.integrationSecrets.listByUser, { userId });
  const routingRows = useQuery(api.routingDefaults.listByUser, { userId });

  // ── Primary brand for template previews ────────────────────────────────
  // Independent of the brand selected for cooking — the picker always shows
  // the user's first brand so custom templates preview with their identity.
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
          setDraftError(res.status === 404 ? "Draft not found." : "Failed to load draft.");
          return;
        }
        const data: { id: string; name: string | null; config: DraftConfig } = await res.json();
        if (cancelled) return;

        const cfg = data.config;

        // Resolve template first (SELECT_TEMPLATE resets objectContent).
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
            Object.entries(cfg.objectContent).map(([id, entry]) => [
              id,
              { id, ...entry },
            ]),
          );
        }

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
      // Fetch full ReleaseResult (credits_remaining, parsed socialCopy)
      fetchingResultRef.current = true;
      fetch(`/api/v1/cook/${state.cookId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: ReleaseResult) => dispatch({ type: "COOK_DONE", results: data }))
        .catch(() => dispatch({ type: "COOK_ERROR", error: "Failed to load results." }))
        .finally(() => { fetchingResultRef.current = false; });
    } else if (releaseStatus === "failed") {
      dispatch({ type: "COOK_ERROR", error: "Generation failed. Try again." });
    } else if (releaseProgressPct != null) {
      dispatch({ type: "SET_PROGRESS", progress: releaseProgressPct });
    }
  }, [releaseStatus, releaseProgressPct, state.status, state.cookId]);

  // Auto-open Approve modal once a draft cook finishes
  useEffect(() => {
    if (state.status !== "done") return;
    if (!draftId || !state.cookId) return;
    if (autoApprovedCookRef.current === state.cookId) return;
    autoApprovedCookRef.current = state.cookId;
    setApproveOpen(true);
  }, [state.status, state.cookId, draftId]);

  // Safety timeout
  useEffect(() => {
    if (state.status !== "cooking" || !state.cookId) return;
    const timeout = setTimeout(() => {
      dispatch({
        type: "COOK_ERROR",
        error: "Taking longer than expected. Check History for your results.",
      });
    }, 5 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [state.status, state.cookId]);

  // ── Cook ─────────────────────────────────────────────────────────────────
  async function handleCook() {
    if (!canCook || !state.templateId) return;

    // Build FormatEntry array — single slide per format
    const objects = Object.values(state.objectContent).filter((m) => {
      // Only include mods that have some content
      return m.text || m.image_url || m.video_url;
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

  // ── Accordion step tracking ──────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState<CookStep | null>("recipe");

  const handleStepToggle = useCallback(
    (step: CookStep) => (open: boolean) => {
      setActiveStep(open ? step : null);
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const sceneStatus = state.status;

  const handleSaveDraft = useCallback(
    async (name: string) => {
      const objectContent: Record<string, { text?: string; image_url?: string; video_url?: string }> = {};
      for (const [id, mod] of Object.entries(state.objectContent)) {
        const entry: { text?: string; image_url?: string; video_url?: string } = {};
        if (mod.text) entry.text = mod.text;
        if (mod.image_url) entry.image_url = mod.image_url;
        if (mod.video_url) entry.video_url = mod.video_url;
        if (Object.keys(entry).length > 0) objectContent[id] = entry;
      }

      const payload: Record<string, unknown> = {
        output: state.outputType,
      };
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
    },
    [state],
  );

  const stepsContent = (
    <>
      {/* Draft banners */}
      {draftLoading && (
        <div className="border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton px-4 py-3 mb-4">
          <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
            Loading draft…
          </p>
        </div>
      )}
      {draftError && (
        <div className="border-2 border-red-500 bg-red-50 px-4 py-3 mb-4">
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-red-700">
            {draftError}
          </p>
        </div>
      )}
      {draftMissingTemplate && (
        <div className="border-2 border-brand bg-gold/20 px-4 py-3 mb-4 shadow-[3px_3px_0_var(--color-brand)]">
          <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand mb-1 uppercase">
            ▸ Heads up
          </p>
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/80">
            Draft referenced template <code className="font-[family-name:var(--font-geist-mono)]">{draftMissingTemplate}</code>{" "}
            which no longer exists. Pick a new one in Recipe below.
          </p>
        </div>
      )}
      {saveSuccess && (
        <div className="border-2 border-brand bg-white px-4 py-3 mb-4 shadow-[3px_3px_0_var(--color-brand)]">
          <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase">
            ✓ Draft saved
          </p>
        </div>
      )}

      {/* Output type toggle — always visible above steps */}
      <div className="space-y-2 mb-4">
        <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
          Output
        </p>
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
      </div>

      {/* Steps (accordion — only one open at a time) */}
      <div className="space-y-0">
        {/* 1. Recipe — Template selection */}
        <CookSection
          title="1. Recipe"
          isOpen={activeStep === "recipe"}
          onToggle={handleStepToggle("recipe")}
        >
          <RecipeStep
            templates={templates}
            selectedId={state.templateId}
            onSelect={(id, config) =>
              dispatch({ type: "SELECT_TEMPLATE", templateId: id, config })
            }
            userBrand={primaryBrand}
          />
        </CookSection>

        {/* 2. Seasoning — Brand / colors */}
        <CookSection
          title="2. Seasoning"
          locked={!hasTemplate}
          isOpen={activeStep === "seasoning"}
          onToggle={handleStepToggle("seasoning")}
        >
          <SeasoningStep
            brandId={state.brandId}
            colors={state.colors}
            onBrandChange={(brandId, colors) =>
              dispatch({ type: "SET_BRAND", brandId, colors })
            }
            onColorsChange={(colors) => dispatch({ type: "SET_COLORS", colors })}
          />
        </CookSection>

        {/* 3. Ingredients — Object content */}
        <CookSection
          title="3. Ingredients"
          locked={!hasContent}
          isOpen={activeStep === "ingredients"}
          onToggle={handleStepToggle("ingredients")}
        >
          {state.templateConfig ? (
            <IngredientsStep
              templateConfig={state.templateConfig}
              objectContent={state.objectContent}
              outputType={state.outputType}
              onContentChange={(id, mod) =>
                dispatch({ type: "SET_CONTENT", id, mod })
              }
            />
          ) : (
            <p className="text-xs font-[family-name:var(--font-geist-sans)] text-brand/50">
              Select a template to see content fields.
            </p>
          )}
        </CookSection>

        {/* 4. Plating — Formats, output type, credits */}
        <CookSection
          title="4. Plating"
          locked={!hasPlating}
          isOpen={activeStep === "plating"}
          onToggle={handleStepToggle("plating")}
        >
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
        </CookSection>

      </div>

      {/* Error message */}
      {state.status === "error" && state.error && (
        <div className="border-2 border-red-500 bg-red-50 px-4 py-3 mt-4" aria-live="polite">
          <p className="text-xs font-[family-name:var(--font-geist-sans)] text-red-700">
            {state.error}
          </p>
        </div>
      )}

      {/* Cook button */}
      <div className="mt-6 sticky bottom-4 z-10 space-y-3">
        <CookButton
          status={state.status}
          disabled={!canCook}
          progress={state.status === "cooking" ? state.progress : undefined}
          isVideo={state.outputType === "video"}
          onClick={state.status === "error"
            ? () => { dispatch({ type: "RESET" }); setActiveStep("recipe"); }
            : handleCook
          }
          onStartOver={() => { dispatch({ type: "RESET" }); setActiveStep("recipe"); }}
        />
        {state.status === "idle" && hasTemplate && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSaveDialogOpen(true)}
              className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-white text-brand hover:bg-gold/20 shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Save as Draft
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {state.status === "done" && state.results && (
        <div className="mt-8" aria-live="polite">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand mb-4">
            Order Up!
          </h2>
          <CookResults result={state.results} />
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6">
        {/* Left column: steps */}
        <div className="space-y-0">
          {stepsContent}
        </div>

        {/* Right column: 3D kitchen scene (desktop only, sticky) */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <KitchenScene3D activeStep={activeStep} status={sceneStatus} />
          </div>
        </div>
      </div>

      <SaveDraftDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveDraft}
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
    </>
  );
}
