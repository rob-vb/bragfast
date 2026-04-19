import { z } from "zod";

// Runtime validator for ObjectModification shape (src/lib/types.ts).
// Used to gate Haiku-generated slide content before insert + render.
export const objectModificationSchema = z.object({
  id: z.string().min(1),
  text: z.string().optional(),
  font_family: z.string().optional(),
  font_weight: z.number().optional(),
  color: z.string().optional(),
  image_url: z.string().optional(),
  video_url: z.string().optional(),
  visual_frame: z.enum(["browser", "mobile", "none"]).optional(),
  visual_frame_color: z.string().optional(),
  anchor_x: z.enum(["left", "center", "right"]).optional(),
  anchor_y: z.enum(["top", "center", "bottom"]).optional(),
  background: z.boolean().optional(),
});

export const slideSchema = z.object({
  objects: z.array(objectModificationSchema).default([]),
});

export const slidesSchema = z.object({
  slides: z.array(slideSchema).min(1),
});

export type ObjectModificationValidated = z.infer<typeof objectModificationSchema>;
export type SlidesValidated = z.infer<typeof slidesSchema>;
