import crypto from "crypto";
import satori from "satori";
import sharp from "sharp";
import { loadFontsForFamily } from "../fonts";
import { headObject, uploadImage } from "../storage/r2";
import type { PublicPr } from "./public-pr";

export function previewCacheKey(repoFullName: string, prNumber: number): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${repoFullName}:${prNumber}`)
    .digest("hex");
  return `preview/${hash}.jpg`;
}

export async function getCachedPreviewUrl(key: string): Promise<string | null> {
  const head = await headObject(key);
  if (!head) return null;
  return `${process.env.R2_PUBLIC_URL!}/${key}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

interface PreviewJsxArgs {
  title: string;
  repoFullName: string;
}

function buildPreviewJsx({ title, repoFullName }: PreviewJsxArgs): React.ReactElement {
  return {
    type: "div",
    key: null,
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#ffffff",
        padding: "80px",
        fontFamily: "Plus Jakarta Sans",
      },
      children: [
        {
          type: "div",
          key: "repo",
          props: {
            style: {
              fontSize: 36,
              fontWeight: 400,
              color: "#6b7280",
            },
            children: repoFullName,
          },
        },
        {
          type: "div",
          key: "title",
          props: {
            style: {
              fontSize: 84,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.1,
              display: "flex",
            },
            children: truncate(title, 120),
          },
        },
        {
          type: "div",
          key: "wm",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 28,
              color: "#94a3b8",
            },
            children: [
              {
                type: "div",
                key: "brand",
                props: { children: "brag.fast preview" },
              },
              {
                type: "div",
                key: "cta",
                props: {
                  style: { fontWeight: 700, color: "#0f172a" },
                  children: "brag.fast",
                },
              },
            ],
          },
        },
      ],
    },
  } as unknown as React.ReactElement;
}

export interface RenderedPreview {
  buffer: Buffer;
  key: string;
}

export async function renderPreviewBuffer(
  pr: Pick<PublicPr, "number" | "title">,
  repoFullName: string,
): Promise<RenderedPreview> {
  const fonts = await loadFontsForFamily("Plus Jakarta Sans");
  const jsx = buildPreviewJsx({ title: pr.title, repoFullName });
  const svg = await satori(jsx, { width: 1080, height: 1080, fonts });
  const buffer = await sharp(Buffer.from(svg))
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 60 })
    .toBuffer();
  return { buffer, key: previewCacheKey(repoFullName, pr.number) };
}

export async function renderAndUploadPreview(
  pr: Pick<PublicPr, "number" | "title">,
  repoFullName: string,
): Promise<string> {
  const key = previewCacheKey(repoFullName, pr.number);
  const existing = await getCachedPreviewUrl(key);
  if (existing) return existing;
  const { buffer } = await renderPreviewBuffer(pr, repoFullName);
  return uploadImage(buffer, key);
}
