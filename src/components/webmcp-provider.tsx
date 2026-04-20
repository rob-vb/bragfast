"use client";

import { useEffect } from "react";

export function WebMcpProvider() {
  useEffect(() => {
    const nav = navigator as Navigator & {
      modelContext?: {
        provideContext: (context: {
          tools: {
            name: string;
            description: string;
            inputSchema: object;
            execute: (args: Record<string, unknown>) => Promise<unknown>;
          }[];
        }) => void;
      };
    };

    if (!nav.modelContext?.provideContext) return;

    nav.modelContext.provideContext({
      tools: [
        {
          name: "bragfast_list_templates",
          description:
            "List available design templates for branded release images and videos.",
          inputSchema: { type: "object", properties: {}, required: [] },
          execute: async () => {
            const res = await fetch("/api/v1/templates");
            return res.json();
          },
        },
        {
          name: "bragfast_list_brands",
          description:
            "List saved brand configurations (colors, logos, fonts).",
          inputSchema: { type: "object", properties: {}, required: [] },
          execute: async () => {
            const res = await fetch("/api/v1/brands");
            return res.json();
          },
        },
        {
          name: "bragfast_generate_release_images",
          description:
            "Generate branded release images from release notes. Returns a render ID to poll for results.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Release title" },
              body: { type: "string", description: "Release notes markdown" },
              templateId: { type: "string", description: "Template ID (optional)" },
              brandId: { type: "string", description: "Brand ID (optional)" },
              formats: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["landscape", "square", "portrait"],
                },
                description: "Output formats (default: all three)",
              },
            },
            required: ["title", "body"],
          },
          execute: async (args) => {
            const res = await fetch("/api/v1/cook/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(args),
            });
            return res.json();
          },
        },
        {
          name: "bragfast_get_render_status",
          description:
            "Poll the status of an in-progress release image or video render.",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Render ID from cook response" },
            },
            required: ["id"],
          },
          execute: async (args) => {
            const res = await fetch(`/api/v1/cook/${args.id}`);
            return res.json();
          },
        },
      ],
    });
  }, []);

  return null;
}
