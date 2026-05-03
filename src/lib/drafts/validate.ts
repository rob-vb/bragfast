import type {
  DraftColors,
  DraftConfig,
  DraftObjectContent,
  DraftOutput,
  DraftVideo,
} from "./types";
import { VALID_ANIMATION_PRESETS } from "@/lib/types";

const VALID_FORMATS = ["landscape", "square", "portrait"] as const;
const VALID_OUTPUTS: DraftOutput[] = ["image", "video"];

export type ValidationError = { ok: false; error: string };
export type ValidationSuccess = { ok: true; config: DraftConfig; name: string | null };
export type ValidationResult = ValidationSuccess | ValidationError;

type Check<T> = { ok: true; value: T } | ValidationError;

const fail = (error: string): ValidationError => ({ ok: false, error });

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function validateColors(v: unknown): Check<DraftColors> {
  if (!isPlainObject(v)) return fail("colors must be object");
  const { background, text, primary } = v as Record<string, unknown>;
  if (typeof background !== "string" || typeof text !== "string" || typeof primary !== "string") {
    return fail("colors requires background, text, primary strings");
  }
  return { ok: true, value: { background, text, primary } };
}

function validateObjectContent(v: unknown): Check<Record<string, DraftObjectContent>> {
  if (!isPlainObject(v)) return fail("objectContent must be object");
  const out: Record<string, DraftObjectContent> = {};
  const stringFields = ["text", "image_url", "video_url", "font_family"] as const;
  const numberFields = ["font_weight"] as const;
  const allowed = [...stringFields, ...numberFields] as readonly string[];
  for (const [key, raw] of Object.entries(v)) {
    if (!isPlainObject(raw)) return fail(`objectContent.${key} must be object`);
    const entry: DraftObjectContent = {};
    for (const field of stringFields) {
      if (raw[field] !== undefined) {
        if (typeof raw[field] !== "string") {
          return fail(`objectContent.${key}.${field} must be string`);
        }
        entry[field] = raw[field] as string;
      }
    }
    for (const field of numberFields) {
      if (raw[field] !== undefined) {
        if (typeof raw[field] !== "number") {
          return fail(`objectContent.${key}.${field} must be number`);
        }
        entry[field] = raw[field] as number;
      }
    }
    const extraKeys = Object.keys(raw).filter((k) => !allowed.includes(k));
    if (extraKeys.length > 0) {
      return fail(`objectContent.${key} has unknown keys: ${extraKeys.join(",")}`);
    }
    out[key] = entry;
  }
  return { ok: true, value: out };
}

function validateVideo(v: unknown): Check<DraftVideo> {
  if (!isPlainObject(v)) return fail("video must be object");
  const entry: DraftVideo = {};
  if (v.duration !== undefined) {
    if (typeof v.duration !== "number" || v.duration <= 0) {
      return fail("video.duration must be positive number");
    }
    entry.duration = v.duration;
  }
  if (v.preset !== undefined) {
    if (
      typeof v.preset !== "string" ||
      !VALID_ANIMATION_PRESETS.includes(v.preset as typeof VALID_ANIMATION_PRESETS[number])
    ) {
      return fail(`video.preset must be one of ${VALID_ANIMATION_PRESETS.join(",")}`);
    }
    entry.preset = v.preset as typeof VALID_ANIMATION_PRESETS[number];
  }
  return { ok: true, value: entry };
}

export function validateDraftPayload(body: unknown): ValidationResult {
  if (!isPlainObject(body)) return fail("body must be object");

  const allowedTop = new Set([
    "name",
    "output",
    "templateId",
    "brandId",
    "colors",
    "formats",
    "objectContent",
    "video",
    "notes",
  ]);
  const unknown = Object.keys(body).filter((k) => !allowedTop.has(k));
  if (unknown.length > 0) return fail(`unknown keys: ${unknown.join(",")}`);

  if (typeof body.output !== "string" || !VALID_OUTPUTS.includes(body.output as DraftOutput)) {
    return fail("output must be 'image' or 'video'");
  }

  let name: string | null = null;
  if (body.name !== undefined) {
    if (typeof body.name !== "string") return fail("name must be string");
    name = body.name;
  }

  const config: DraftConfig = { output: body.output as DraftOutput };

  if (body.templateId !== undefined) {
    if (typeof body.templateId !== "string") return fail("templateId must be string");
    config.templateId = body.templateId;
  }
  if (body.brandId !== undefined) {
    if (typeof body.brandId !== "string") return fail("brandId must be string");
    config.brandId = body.brandId;
  }
  if (body.colors !== undefined) {
    const c = validateColors(body.colors);
    if (!c.ok) return c;
    config.colors = c.value;
  }
  if (body.formats !== undefined) {
    if (!Array.isArray(body.formats)) return fail("formats must be array");
    for (const f of body.formats) {
      if (typeof f !== "string" || !VALID_FORMATS.includes(f as typeof VALID_FORMATS[number])) {
        return fail(`formats must be subset of ${VALID_FORMATS.join(",")}`);
      }
    }
    config.formats = body.formats as DraftConfig["formats"];
  }
  if (body.objectContent !== undefined) {
    const oc = validateObjectContent(body.objectContent);
    if (!oc.ok) return oc;
    config.objectContent = oc.value;
  }
  if (body.video !== undefined) {
    const vid = validateVideo(body.video);
    if (!vid.ok) return vid;
    config.video = vid.value;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") return fail("notes must be string");
    config.notes = body.notes;
  }

  return { ok: true, config, name };
}
