import { promises as fs } from "node:fs";
import path from "node:path";

const IMAGE_FORMATS = ["landscape", "square", "portrait"] as const;
const imageFormatSet = new Set<string>(IMAGE_FORMATS);

export type ScheduleFormat = (typeof IMAGE_FORMATS)[number];
export type ScheduleMode =
  | { type: "queue" }
  | { type: "custom"; scheduledAt: string }
  | { mode: "queue" }
  | { mode: "custom"; scheduledAt: string };

export interface ScheduleSelection {
  format: ScheduleFormat;
  channelIds?: string[];
  channelId?: string;
  channelName?: string;
  provider?: "buffer";
}

export interface ResolveAndScheduleArgs {
  outputDir: string;
  apiKey: string;
  backendBase: string;
  draftId: string;
  selections: ScheduleSelection[];
  caption: string;
  scheduling: ScheduleMode;
  stdout: Pick<NodeJS.WriteStream, "write">;
}

export interface ScheduleConfirmation {
  provider: string;
  channelId: string;
  channelName?: string;
  format: ScheduleFormat;
  status: string;
  scheduledAt?: string;
  externalId?: string;
}

interface UploadDescriptor {
  format: ScheduleFormat;
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

interface UploadUrlResponse {
  uploads: UploadDescriptor[];
}

interface ScheduleResponse {
  ok?: boolean;
  releaseId?: string;
  scheduled?: ScheduleConfirmation[];
  confirmation?: ScheduleConfirmation[];
}

function isSafeId(value: string): boolean {
  return value.length > 0 && !value.includes("..") && !value.includes("/");
}

function assertImageFormat(value: string): asserts value is ScheduleFormat {
  if (!imageFormatSet.has(value)) {
    throw new Error(`format must be one of: ${IMAGE_FORMATS.join(", ")}`);
  }
}

function selectedFormats(selections: ScheduleSelection[]): ScheduleFormat[] {
  const formats = new Set<ScheduleFormat>();
  for (const selection of selections) {
    assertImageFormat(selection.format);
    const channelIds = selection.channelIds ?? (selection.channelId ? [selection.channelId] : []);
    if (channelIds.length === 0) continue;
    formats.add(selection.format);
  }
  return [...formats];
}

function resolveOutputPath(outputDir: string, draftId: string, format: ScheduleFormat): string {
  const root = path.resolve(outputDir);
  const filePath = path.resolve(path.join(root, draftId, `${format}.jpg`));
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Resolved output path escaped outputDir");
  }
  return filePath;
}

function normalizeScheduling(scheduling: ScheduleMode): { type: "queue" } | { type: "custom"; scheduledAt: string } {
  if ("type" in scheduling) return scheduling;
  if (scheduling.mode === "queue") return { type: "queue" };
  return { type: "custom", scheduledAt: scheduling.scheduledAt };
}

function expandSelections(selections: ScheduleSelection[]) {
  return selections.flatMap((selection) => {
    const channelIds = selection.channelIds ?? (selection.channelId ? [selection.channelId] : []);
    return channelIds.map((channelId) => ({
      format: selection.format,
      provider: "buffer" as const,
      channelId,
      ...(selection.channelName ? { channelName: selection.channelName } : {}),
    }));
  });
}

async function postJson<T>(url: string, apiKey: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${url} failed (${response.status})${text ? `: ${text}` : ""}`);
  }

  return (await response.json()) as T;
}

async function putJpeg(upload: UploadDescriptor, buffer: Buffer): Promise<void> {
  const response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`${upload.format} upload failed (${response.status})`);
  }
}

export async function resolveAndSchedule(args: ResolveAndScheduleArgs): Promise<{ confirmation: ScheduleConfirmation[] }> {
  if (!isSafeId(args.draftId)) {
    throw new Error("draftId must be a safe non-empty string");
  }

  const formats = selectedFormats(args.selections);
  if (formats.length === 0) {
    throw new Error("At least one image selection is required");
  }

  try {
    const uploads = await postJson<UploadUrlResponse>(
      `${args.backendBase}/api/v1/schedule/upload-url`,
      args.apiKey,
      { draftId: args.draftId, formats },
    );

    const urls: Record<string, string> = {};
    const keys: Record<string, string> = {};

    await Promise.all(
      uploads.uploads.map(async (upload) => {
        assertImageFormat(upload.format);
        args.stdout.write(`  [brag] Uploading ${upload.format} to R2\n`);
        const buffer = await fs.readFile(resolveOutputPath(args.outputDir, args.draftId, upload.format));
        await putJpeg(upload, buffer);
        urls[upload.format] = upload.publicUrl;
        keys[upload.format] = upload.key;
      }),
    );

    args.stdout.write("  [brag] Scheduling via Buffer\n");
    const scheduled = await postJson<ScheduleResponse>(
      `${args.backendBase}/api/v1/schedule`,
      args.apiKey,
      {
        draftId: args.draftId,
        urls,
        keys,
        selections: expandSelections(args.selections),
        caption: args.caption,
        scheduling: normalizeScheduling(args.scheduling),
      },
    );

    const confirmation = scheduled.confirmation ?? scheduled.scheduled ?? [];
    args.stdout.write("  [brag] Schedule request complete\n");
    return { confirmation };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    args.stdout.write(`  [brag] Schedule failed: ${message}\n`);
    throw err;
  }
}
