import type { CanvasTemplateConfig } from "./canvas-types";

export const CANVAS_DEFAULTS: Record<string, { name: string; config: CanvasTemplateConfig }> = {
  "standard-browser": {
    name: "Standard Browser",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 64, y: 302, width: 1072, height: 603, opacity: 1, zIndex: 1, visualFrame: "browser", visualFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 24, width: 411, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
            { id: "title", type: "text", name: "title", x: 64, y: 102, width: 1072, height: 89, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 191, width: 1072, height: 60, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top", textFit: false },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 64, y: 438, width: 952, height: 700, opacity: 1, zIndex: 1, visualFrame: "browser", visualFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 360, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 271, width: 952, height: 220, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", textFit: false },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 64, y: 473, width: 952, height: 915, opacity: 1, zIndex: 1, visualFrame: "browser", visualFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 36, width: 731, height: 54, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 100, width: 952, height: 100, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 216, width: 952, height: 200, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", textFit: false },
          ],
        },
      },
    },
  },
  "standard-mobile": {
    name: "Standard Mobile",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 449, y: 279, width: 303, height: 605, opacity: 1, zIndex: 1, visualFrame: "mobile", visualFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 24, width: 411, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
            { id: "title", type: "text", name: "title", x: 64, y: 109, width: 1072, height: 89, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 64, y: 198, width: 1072, height: 60, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 340, y: 524, width: 401, height: 803, opacity: 1, zIndex: 1, visualFrame: "mobile", visualFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 624, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 64, y: 272, width: 952, height: 200, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 288, y: 539, width: 505, height: 1050, opacity: 1, zIndex: 1, visualFrame: "mobile", visualFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 36, width: 731, height: 54, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 100, width: 952, height: 100, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 64, y: 216, width: 952, height: 240, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
      },
    },
  },
  "split-browser": {
    name: "Split Browser",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 630, y: 64, width: 643, height: 547, opacity: 1, zIndex: 1, visualFrame: "browser", visualFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 64, width: 418, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 179, width: 502, height: 162, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here" },
            { id: "description", type: "text", name: "description", x: 64, y: 358, width: 502, height: 253, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 556, y: 96, width: 1009, height: 890, opacity: 1, zIndex: 1, visualFrame: "browser", visualFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 96, width: 406, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 55, y: 224, width: 433, height: 340, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here" },
            { id: "description", type: "text", name: "description", x: 59, y: 585, width: 429, height: 401, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 589, y: 64, width: 1041, height: 1222, opacity: 1, zIndex: 1, visualFrame: "browser", visualFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 64, width: 400, height: 54, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 48, y: 228, width: 474, height: 420, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here" },
            { id: "description", type: "text", name: "description", x: 48, y: 664, width: 400, height: 630, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
      },
    },
  },
  "split-mobile": {
    name: "Split Mobile",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 730, y: 48, width: 390, height: 700, opacity: 1, zIndex: 1, visualFrame: "mobile", visualFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 418, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 147, width: 586, height: 183, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 64, y: 338, width: 586, height: 283, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 570, y: 80, width: 460, height: 1100, opacity: 1, zIndex: 1, visualFrame: "mobile", visualFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 80, width: 406, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 59, y: 201, width: 429, height: 364, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 59, y: 585, width: 429, height: 401, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 707, y: 140, width: 550, height: 1070, opacity: 1, zIndex: 1, visualFrame: "mobile", visualFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 140, width: 400, height: 54, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 48, y: 278, width: 553, height: 370, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 48, y: 664, width: 400, height: 630, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
      },
    },
  },
  "hero": {
    name: "Hero",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 0, y: 0, width: 1200, height: 675, opacity: 0.6, zIndex: 0, visualFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 64, y: 393, width: 1072, height: 120, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary", textFit: true },
            { id: "description", type: "text", name: "description", x: 200, y: 530, width: 800, height: 80, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 367, y: 309, width: 466, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 0, y: 0, width: 1080, height: 1080, opacity: 0.6, zIndex: 0, visualFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 80, y: 720, width: 920, height: 135, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary", textFit: true },
            { id: "description", type: "text", name: "description", x: 140, y: 872, width: 800, height: 159, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 217, y: 634, width: 646, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "visual", name: "visual", x: 0, y: 0, width: 1080, height: 1350, opacity: 0.6, zIndex: 0, visualFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 76, y: 960, width: 920, height: 134, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary", textFit: true },
            { id: "description", type: "text", name: "description", x: 140, y: 1110, width: 800, height: 190, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 292, y: 880, width: 497, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
          ],
        },
      },
    },
  },
  "carousel-slide": {
    name: "Carousel Slide",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "bg_arcs_tl", type: "visual", name: "arcs (top-left)", x: -40, y: -40, width: 320, height: 320, opacity: 0.35, zIndex: 0, src: "/templates/carousel/arc-rings-tl.png", objectFit: "contain" },
            { id: "bg_arcs_br", type: "visual", name: "arcs (bottom-right)", x: 920, y: 395, width: 320, height: 320, opacity: 0.35, zIndex: 0, src: "/templates/carousel/arc-rings-br.png", objectFit: "contain" },
            { id: "eyebrow", type: "text", name: "eyebrow", x: 80, y: 36, width: 1040, height: 28, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 20, fontWeight: 600, letterSpacing: 1.2, lineHeight: 1.2, textAlign: "center", verticalAlign: "top", colorRole: "primary", previewText: "" },
            { id: "badge_ring", type: "visual", name: "badge ring", x: 565, y: 110, width: 70, height: 70, opacity: 1, zIndex: 3, src: "/templates/carousel/badge-ring.png", objectFit: "contain" },
            { id: "badge", type: "text", name: "badge", x: 565, y: 110, width: 70, height: 70, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 30, fontWeight: 400, lineHeight: 1, textAlign: "center", verticalAlign: "center", colorRole: "primary", previewText: "1" },
            { id: "heading", type: "text", name: "heading", x: 80, y: 200, width: 1040, height: 160, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 68, fontWeight: 400, lineHeight: 1.1, letterSpacing: 0, textAlign: "center", verticalAlign: "center", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Title goes *here*", textFit: false },
            { id: "body", type: "text", name: "body", x: 200, y: 380, width: 800, height: 140, opacity: 0.92, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 26, fontWeight: 400, lineHeight: 1.5, textAlign: "center", verticalAlign: "top", colorRole: "text", previewText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim." },
            { id: "cta_text", type: "text", name: "cta", x: 460, y: 540, width: 280, height: 56, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 700, lineHeight: 1, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 999, paddingX: 24, paddingY: 12, previewText: "" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 590, width: 56, height: 56, opacity: 1, zIndex: 5, borderRadius: 28, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 152, y: 590, width: 400, height: 26, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 700, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 152, y: 620, width: 400, height: 22, opacity: 0.65, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 14, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
        square: {
          objects: [
            { id: "bg_arcs_tl", type: "visual", name: "arcs (top-left)", x: -50, y: -50, width: 460, height: 460, opacity: 0.35, zIndex: 0, src: "/templates/carousel/arc-rings-tl.png", objectFit: "contain" },
            { id: "bg_arcs_br", type: "visual", name: "arcs (bottom-right)", x: 670, y: 670, width: 460, height: 460, opacity: 0.35, zIndex: 0, src: "/templates/carousel/arc-rings-br.png", objectFit: "contain" },
            { id: "eyebrow", type: "text", name: "eyebrow", x: 80, y: 80, width: 920, height: 32, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, letterSpacing: 1.2, lineHeight: 1.2, textAlign: "center", verticalAlign: "top", colorRole: "primary", previewText: "" },
            { id: "badge_ring", type: "visual", name: "badge ring", x: 495, y: 200, width: 90, height: 90, opacity: 1, zIndex: 3, src: "/templates/carousel/badge-ring.png", objectFit: "contain" },
            { id: "badge", type: "text", name: "badge", x: 495, y: 200, width: 90, height: 90, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 38, fontWeight: 400, lineHeight: 1, textAlign: "center", verticalAlign: "center", colorRole: "primary", previewText: "1" },
            { id: "heading", type: "text", name: "heading", x: 80, y: 320, width: 920, height: 240, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 86, fontWeight: 400, lineHeight: 1.1, textAlign: "center", verticalAlign: "center", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Title goes *here*", textFit: false },
            { id: "body", type: "text", name: "body", x: 130, y: 600, width: 820, height: 200, opacity: 0.92, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, lineHeight: 1.5, textAlign: "center", verticalAlign: "top", colorRole: "text", previewText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim." },
            { id: "cta_text", type: "text", name: "cta", x: 380, y: 840, width: 320, height: 64, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 24, fontWeight: 700, lineHeight: 1, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 999, paddingX: 28, paddingY: 14, previewText: "" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 950, width: 64, height: 64, opacity: 1, zIndex: 5, borderRadius: 32, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 160, y: 952, width: 600, height: 30, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 20, fontWeight: 700, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 160, y: 986, width: 600, height: 26, opacity: 0.65, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 16, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
        portrait: {
          objects: [
            { id: "bg_arcs_tl", type: "visual", name: "arcs (top-left)", x: -40, y: -40, width: 540, height: 540, opacity: 0.35, zIndex: 0, src: "/templates/carousel/arc-rings-tl.png", objectFit: "contain" },
            { id: "bg_arcs_br", type: "visual", name: "arcs (bottom-right)", x: 580, y: 850, width: 540, height: 540, opacity: 0.35, zIndex: 0, src: "/templates/carousel/arc-rings-br.png", objectFit: "contain" },
            { id: "eyebrow", type: "text", name: "eyebrow", x: 80, y: 96, width: 920, height: 32, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, letterSpacing: 1.4, lineHeight: 1.2, textAlign: "center", verticalAlign: "top", colorRole: "primary", previewText: "" },
            { id: "badge_ring", type: "visual", name: "badge ring", x: 490, y: 380, width: 100, height: 100, opacity: 1, zIndex: 3, src: "/templates/carousel/badge-ring.png", objectFit: "contain" },
            { id: "badge", type: "text", name: "badge", x: 490, y: 380, width: 100, height: 100, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 44, fontWeight: 400, lineHeight: 1, textAlign: "center", verticalAlign: "center", colorRole: "primary", previewText: "1" },
            { id: "heading", type: "text", name: "heading", x: 80, y: 520, width: 920, height: 280, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 96, fontWeight: 400, lineHeight: 1.1, textAlign: "center", verticalAlign: "center", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Title goes *here*", textFit: false },
            { id: "body", type: "text", name: "body", x: 130, y: 850, width: 820, height: 200, opacity: 0.92, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 34, fontWeight: 400, lineHeight: 1.5, textAlign: "center", verticalAlign: "top", colorRole: "text", previewText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim." },
            { id: "cta_text", type: "text", name: "cta", x: 370, y: 1090, width: 340, height: 72, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 26, fontWeight: 700, lineHeight: 1, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 999, paddingX: 30, paddingY: 16, previewText: "" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 1230, width: 72, height: 72, opacity: 1, zIndex: 5, borderRadius: 36, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 168, y: 1234, width: 700, height: 32, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 700, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 168, y: 1272, width: 700, height: 28, opacity: 0.65, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
      },
    },
  },
};

export function getCanvasDefaultConfig(name: string): CanvasTemplateConfig | null {
  return CANVAS_DEFAULTS[name]?.config ?? null;
}
