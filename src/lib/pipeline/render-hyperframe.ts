import type { VariableManifest } from "../templates/hyperframe-manifest";
import { resolveVariables, type Brand, type CookInput } from "../templates/hyperframe-variables";

export type HyperframeFormat = "landscape" | "square" | "portrait";

export type LambdaInput = {
  html: string;
  variables: Record<string, unknown>;
  format: HyperframeFormat;
  duration: number;
  presignedPutUrl: string;
};

export type LambdaResult =
  | { ok: true; durationMs: number }
  | { ok: false; reason: string };

export type RenderHyperframeDeps = {
  readComposition: (templateId: string, format: HyperframeFormat) => Promise<{ html: string }>;
  mintPresignedPutUrl: (key: string) => Promise<{ url: string; publicUrl: string }>;
  invokeLambda: (input: LambdaInput) => Promise<LambdaResult>;
  markCompleted: (releaseId: string, outputs: Array<{ format: HyperframeFormat; url: string }>) => Promise<void>;
  markFailed: (releaseId: string, reason: string) => Promise<void>;
  refundCredits: (releaseId: string, credits: number) => Promise<void>;
};

export type RenderHyperframeInput = {
  releaseId: string;
  templateId: string;
  formats: HyperframeFormat[];
  cookInput: CookInput;
  brand: Brand;
  manifest: VariableManifest;
  duration: number;
  creditsPerFormat: number;
};

export async function renderHyperframe(
  input: RenderHyperframeInput,
  deps: RenderHyperframeDeps,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const variables = resolveVariables(input.manifest, input.cookInput, input.brand);
  const outputs: Array<{ format: HyperframeFormat; url: string }> = [];
  const failures: Array<{ format: HyperframeFormat; reason: string }> = [];

  for (const format of input.formats) {
    try {
      const { html } = await deps.readComposition(input.templateId, format);
      const key = `releases/${input.releaseId}/${format}.mp4`;
      const { url, publicUrl } = await deps.mintPresignedPutUrl(key);
      const result = await deps.invokeLambda({
        html,
        variables,
        format,
        duration: input.duration,
        presignedPutUrl: url,
      });
      if (result.ok) {
        outputs.push({ format, url: publicUrl });
      } else {
        failures.push({ format, reason: result.reason });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ format, reason });
    }
  }

  if (outputs.length === 0) {
    const reason = failures[0]?.reason ?? "all formats failed";
    await deps.refundCredits(input.releaseId, input.creditsPerFormat * input.formats.length);
    await deps.markFailed(input.releaseId, reason);
    return { ok: false, reason };
  }

  if (failures.length > 0) {
    await deps.refundCredits(input.releaseId, input.creditsPerFormat * failures.length);
  }
  await deps.markCompleted(input.releaseId, outputs);
  return { ok: true };
}
