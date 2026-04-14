"use client";

import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { KitchenScene3D } from "@/components/kitchen/kitchen-scene-3d";
import { CookSection } from "@/components/kitchen/cook-section";
import type { CookStep } from "@/components/kitchen/kitchen-animation-state";
import { RecipeStep, type TemplateItem } from "@/components/kitchen/recipe-step";
import { SeasoningStep } from "@/components/kitchen/seasoning-step";
import { IngredientsStep } from "@/components/kitchen/ingredients-step";
import { PlatingStep } from "@/components/kitchen/plating-step";
import type { VideoTemplateItem } from "@/components/kitchen/video-template-picker";
import { CookButton } from "@/components/kitchen/cook-button";
import { CookResults } from "@/components/kitchen/cook-results";
import { useReleaseProgress } from "@/hooks/use-release-progress";
import { useUserId } from "@/hooks/use-user-id";
import type { CanvasTemplateConfig, FormatKey } from "@/lib/templates/canvas-types";
import type { AnimationPreset, ObjectModification, ReleaseResult, FormatEntry } from "@/lib/types";

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
  videoTemplateId: string | null;
  videoTemplateHasHero: boolean;
  autoSelectedPreset?: AnimationPreset;
  status: "idle" | "cooking" | "done" | "error";
  cookId?: string;
  progress?: number;
  results?: ReleaseResult;
  error?: string;
}

const DEFAULT_COLORS = { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" };

const INITIAL_STATE: CookState = {
  templateId: null,
  templateConfig: null,
  colors: DEFAULT_COLORS,
  objectContent: {},
  formats: ["landscape", "square", "portrait"],
  outputType: "image",
  videoTemplateId: null,
  videoTemplateHasHero: false,
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
  | {
      type: "SET_VIDEO_TEMPLATE";
      videoTemplateId: string;
      animationPreset: AnimationPreset;
      hasHero: boolean;
    }
  | { type: "START_COOK" }
  | { type: "SET_COOK_ID"; cookId: string }
  | { type: "SET_PROGRESS"; progress: number }
  | { type: "COOK_DONE"; results: ReleaseResult }
  | { type: "COOK_ERROR"; error: string }
  | { type: "RESET" };

function cookReducer(state: CookState, action: CookAction): CookState {
  switch (action.type) {
    case "SELECT_TEMPLATE":
      return {
        ...state,
        templateId: action.templateId,
        templateConfig: action.config,
        // Seed colors from template if no brand selected
        colors: state.brandId
          ? state.colors
          : { ...DEFAULT_COLORS, ...action.config.colors },
        objectContent: {},
      };

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

    case "SET_OUTPUT_TYPE":
      if (action.outputType === "image") {
        return {
          ...state,
          outputType: "image",
          animationPreset: undefined,
          videoTemplateId: null,
          videoTemplateHasHero: false,
          autoSelectedPreset: undefined,
        };
      }
      return { ...state, outputType: "video" };

    case "SET_ANIMATION_PRESET":
      return { ...state, animationPreset: action.preset, autoSelectedPreset: undefined };

    case "SET_VIDEO_TEMPLATE":
      return {
        ...state,
        videoTemplateId: action.videoTemplateId,
        videoTemplateHasHero: action.hasHero,
        animationPreset: action.animationPreset,
        autoSelectedPreset: action.animationPreset,
      };

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

    case "RESET":
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CookPageProps {
  templates: TemplateItem[];
  videoTemplates: VideoTemplateItem[];
}

export function CookPage({ templates, videoTemplates }: CookPageProps) {
  const [state, dispatch] = useReducer(cookReducer, INITIAL_STATE);
  const userId = useUserId();

  // Progressive disclosure
  const hasTemplate = !!state.templateId;
  const hasContent = hasTemplate; // unlock after template selected
  const hasPlating = hasTemplate;
  const canCook = hasTemplate && state.formats.length > 0 && state.status !== "cooking";

  // ── Live credit balance ─────────────────────────────────────────────────
  const creditBalance = useQuery(api.userProfiles.getBalance, { userId });

  // ── Real-time release progress (replaces polling) ───────────────────────
  const releaseProgress = useReleaseProgress(state.cookId);
  const releaseStatus = releaseProgress?.status;
  const releaseProgressPct = releaseProgress?.progress;
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
      return m.text || m.image_url;
    });

    const formats: FormatEntry[] = state.formats.map((fmt) => ({
      name: fmt,
      slides: [{ objects: objects.length > 0 ? objects : undefined }],
    }));

    const templateForRender =
      state.outputType === "video" && state.videoTemplateId
        ? state.videoTemplateId
        : state.templateId;

    const body: Record<string, unknown> = {
      template: templateForRender,
      formats,
      ...(state.brandId ? { brand_id: state.brandId } : { colors: state.colors }),
      source: "dashboard",
    };

    if (state.outputType === "video") {
      body.video = state.animationPreset ? { preset: state.animationPreset } : true;
    }

    fetchingResultRef.current = false;
    dispatch({ type: "START_COOK" });

    try {
      const res = await fetch("/api/v1/cook", {
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

  const stepsContent = (
    <>
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
            videoTemplates={videoTemplates}
            videoTemplateId={state.videoTemplateId}
            autoSelectedPreset={state.autoSelectedPreset}
            selectedVideoHasHero={state.videoTemplateHasHero}
            onToggleFormat={(fmt) => dispatch({ type: "TOGGLE_FORMAT", format: fmt })}
            onOutputTypeChange={(t) => dispatch({ type: "SET_OUTPUT_TYPE", outputType: t })}
            onAnimationPresetChange={(p) =>
              dispatch({ type: "SET_ANIMATION_PRESET", preset: p })
            }
            onVideoTemplateChange={(t) =>
              dispatch({
                type: "SET_VIDEO_TEMPLATE",
                videoTemplateId: t.id,
                animationPreset: t.animationPreset,
                hasHero: t.hasHero,
              })
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
      <div className="mt-6 sticky bottom-4 z-10">
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
  );
}
