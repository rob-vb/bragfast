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
  "carousel-cover": {
    name: "Carousel Cover",
    config: {
      version: 2,
      colors: { background: "#F4ECDC", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "eyebrow", type: "text", name: "eyebrow", x: 80, y: 80, width: 1040, height: 36, opacity: 0.85, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 24, fontWeight: 600, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", colorRole: "primary", previewText: "Learn how to" },
            { id: "title", type: "text", name: "title", x: 80, y: 140, width: 1040, height: 280, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 84, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "top", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Turn an *idea* into a success", textFit: false },
            { id: "subhead", type: "text", name: "subhead", x: 80, y: 440, width: 1040, height: 100, opacity: 0.85, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, lineHeight: 1.4, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "A field guide for builders" },
            { id: "swipe_cta", type: "text", name: "swipe", x: 80, y: 560, width: 220, height: 56, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 700, lineHeight: 1, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 999, paddingX: 24, paddingY: 12, previewText: "Swipe →" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 580, width: 56, height: 56, opacity: 1, zIndex: 5, borderRadius: 28, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 152, y: 580, width: 380, height: 28, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 20, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 152, y: 612, width: 380, height: 24, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 16, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
        square: {
          objects: [
            { id: "eyebrow", type: "text", name: "eyebrow", x: 80, y: 120, width: 920, height: 40, opacity: 0.85, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 28, fontWeight: 600, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", colorRole: "primary", previewText: "Learn how to" },
            { id: "title", type: "text", name: "title", x: 80, y: 200, width: 920, height: 380, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 96, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "top", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Turn an *idea* into a success", textFit: false },
            { id: "subhead", type: "text", name: "subhead", x: 80, y: 620, width: 920, height: 160, opacity: 0.85, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 36, fontWeight: 400, lineHeight: 1.4, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "A field guide for builders" },
            { id: "swipe_cta", type: "text", name: "swipe", x: 80, y: 820, width: 240, height: 64, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 24, fontWeight: 700, lineHeight: 1, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 999, paddingX: 28, paddingY: 14, previewText: "Swipe →" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 960, width: 64, height: 64, opacity: 1, zIndex: 5, borderRadius: 32, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 160, y: 960, width: 600, height: 32, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 160, y: 996, width: 600, height: 28, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
        portrait: {
          objects: [
            { id: "eyebrow", type: "text", name: "eyebrow", x: 80, y: 160, width: 920, height: 40, opacity: 0.85, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 28, fontWeight: 600, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", colorRole: "primary", previewText: "Learn how to" },
            { id: "title", type: "text", name: "title", x: 80, y: 240, width: 920, height: 460, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 100, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "top", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Turn an *idea* into a success", textFit: false },
            { id: "subhead", type: "text", name: "subhead", x: 80, y: 740, width: 920, height: 180, opacity: 0.85, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 38, fontWeight: 400, lineHeight: 1.4, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "A field guide for builders" },
            { id: "swipe_cta", type: "text", name: "swipe", x: 80, y: 960, width: 260, height: 72, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 26, fontWeight: 700, lineHeight: 1, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 999, paddingX: 30, paddingY: 16, previewText: "Swipe →" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 1230, width: 72, height: 72, opacity: 1, zIndex: 5, borderRadius: 36, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 168, y: 1232, width: 700, height: 32, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 168, y: 1270, width: 700, height: 28, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
      },
    },
  },
  "carousel-content-text": {
    name: "Carousel Content (Text)",
    config: {
      version: 2,
      colors: { background: "#F4ECDC", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "badge", type: "text", name: "badge", x: 80, y: 80, width: 80, height: 80, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 36, fontWeight: 800, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 16, previewText: "1" },
            { id: "heading", type: "text", name: "heading", x: 180, y: 80, width: 940, height: 120, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 56, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "center", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Pick the *right* problem", textFit: false },
            { id: "body", type: "text", name: "body", x: 80, y: 240, width: 1040, height: 320, opacity: 0.9, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 28, fontWeight: 400, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "Body paragraph goes here. Keep it conversational and scannable." },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 580, width: 56, height: 56, opacity: 1, zIndex: 5, borderRadius: 28, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 152, y: 580, width: 380, height: 28, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 20, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 152, y: 612, width: 380, height: 24, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 16, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
        square: {
          objects: [
            { id: "badge", type: "text", name: "badge", x: 80, y: 120, width: 96, height: 96, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 44, fontWeight: 800, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 20, previewText: "1" },
            { id: "heading", type: "text", name: "heading", x: 200, y: 120, width: 800, height: 96, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 64, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "center", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Pick the *right* problem", textFit: false },
            { id: "body", type: "text", name: "body", x: 80, y: 280, width: 920, height: 600, opacity: 0.9, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "Body paragraph goes here." },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 960, width: 64, height: 64, opacity: 1, zIndex: 5, borderRadius: 32, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 160, y: 960, width: 600, height: 32, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 160, y: 996, width: 600, height: 28, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
        portrait: {
          objects: [
            { id: "badge", type: "text", name: "badge", x: 80, y: 160, width: 104, height: 104, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 800, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 20, previewText: "1" },
            { id: "heading", type: "text", name: "heading", x: 208, y: 160, width: 792, height: 104, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 64, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "center", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Pick the *right* problem", textFit: false },
            { id: "body", type: "text", name: "body", x: 80, y: 320, width: 920, height: 800, opacity: 0.9, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 34, fontWeight: 400, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "Body paragraph goes here." },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 1230, width: 72, height: 72, opacity: 1, zIndex: 5, borderRadius: 36, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 168, y: 1232, width: 700, height: 32, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 168, y: 1270, width: 700, height: 28, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
      },
    },
  },
  "carousel-content-image": {
    name: "Carousel Content (Image)",
    config: {
      version: 2,
      colors: { background: "#F4ECDC", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "badge", type: "text", name: "badge", x: 80, y: 80, width: 80, height: 80, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 36, fontWeight: 800, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 16, previewText: "1" },
            { id: "heading", type: "text", name: "heading", x: 180, y: 80, width: 420, height: 100, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 44, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "center", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Pick the *right* problem", textFit: false },
            { id: "body", type: "text", name: "body", x: 80, y: 220, width: 520, height: 380, opacity: 0.9, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 24, fontWeight: 400, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "Body paragraph goes here." },
            { id: "side_image", type: "visual", name: "side image", x: 640, y: 60, width: 480, height: 540, opacity: 1, zIndex: 2, visualFrame: "none", objectFit: "cover", borderRadius: 24, anchorX: "center", anchorY: "center" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 580, width: 56, height: 56, opacity: 1, zIndex: 5, borderRadius: 28, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 152, y: 580, width: 380, height: 28, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 20, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 152, y: 612, width: 380, height: 24, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 16, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
        square: {
          objects: [
            { id: "badge", type: "text", name: "badge", x: 80, y: 120, width: 96, height: 96, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 44, fontWeight: 800, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 20, previewText: "1" },
            { id: "heading", type: "text", name: "heading", x: 200, y: 120, width: 800, height: 96, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 56, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "center", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Pick the *right* problem", textFit: false },
            { id: "body", type: "text", name: "body", x: 80, y: 280, width: 460, height: 600, opacity: 0.9, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 28, fontWeight: 400, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "Body paragraph goes here." },
            { id: "side_image", type: "visual", name: "side image", x: 580, y: 280, width: 420, height: 600, opacity: 1, zIndex: 2, visualFrame: "none", objectFit: "cover", borderRadius: 24, anchorX: "center", anchorY: "center" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 960, width: 64, height: 64, opacity: 1, zIndex: 5, borderRadius: 32, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 160, y: 960, width: 600, height: 32, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 160, y: 996, width: 600, height: 28, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
        portrait: {
          objects: [
            { id: "badge", type: "text", name: "badge", x: 80, y: 160, width: 104, height: 104, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 800, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 20, previewText: "1" },
            { id: "heading", type: "text", name: "heading", x: 208, y: 160, width: 792, height: 104, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 56, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "center", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Pick the *right* problem", textFit: false },
            { id: "side_image", type: "visual", name: "side image", x: 80, y: 320, width: 920, height: 480, opacity: 1, zIndex: 2, visualFrame: "none", objectFit: "cover", borderRadius: 24, anchorX: "center", anchorY: "center" },
            { id: "body", type: "text", name: "body", x: 80, y: 840, width: 920, height: 320, opacity: 0.9, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 30, fontWeight: 400, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "Body paragraph goes here." },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 80, y: 1230, width: 72, height: 72, opacity: 1, zIndex: 5, borderRadius: 36, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 168, y: 1232, width: 700, height: 32, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 168, y: 1270, width: 700, height: 28, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 400, textAlign: "left", verticalAlign: "top", colorRole: "text" },
          ],
        },
      },
    },
  },
  "carousel-outro": {
    name: "Carousel Outro",
    config: {
      version: 2,
      colors: { background: "#F4ECDC", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "eyebrow", type: "text", name: "eyebrow", x: 80, y: 80, width: 1040, height: 36, opacity: 0.85, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 24, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "primary", previewText: "Let's get started!" },
            { id: "title", type: "text", name: "title", x: 80, y: 140, width: 1040, height: 220, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "top", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Ready to *ship*?", textFit: false },
            { id: "cta_paragraph", type: "text", name: "paragraph", x: 80, y: 380, width: 1040, height: 140, opacity: 0.9, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 28, fontWeight: 400, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "Follow for more like this." },
            { id: "cta_button", type: "text", name: "cta", x: 80, y: 540, width: 280, height: 64, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 24, fontWeight: 700, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 999, paddingX: 28, paddingY: 14, previewText: "Follow →" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 980, y: 580, width: 56, height: 56, opacity: 1, zIndex: 5, borderRadius: 28, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 600, y: 580, width: 360, height: 28, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 20, fontWeight: 600, textAlign: "right", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 600, y: 612, width: 360, height: 24, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 16, fontWeight: 400, textAlign: "right", verticalAlign: "top", colorRole: "text" },
          ],
        },
        square: {
          objects: [
            { id: "eyebrow", type: "text", name: "eyebrow", x: 80, y: 120, width: 920, height: 40, opacity: 0.85, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 28, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "primary", previewText: "Let's get started!" },
            { id: "title", type: "text", name: "title", x: 80, y: 200, width: 920, height: 320, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 88, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "top", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Ready to *ship*?", textFit: false },
            { id: "cta_paragraph", type: "text", name: "paragraph", x: 80, y: 560, width: 920, height: 200, opacity: 0.9, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "Follow for more like this." },
            { id: "cta_button", type: "text", name: "cta", x: 80, y: 800, width: 280, height: 72, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 26, fontWeight: 700, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 999, paddingX: 30, paddingY: 16, previewText: "Follow →" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 936, y: 960, width: 64, height: 64, opacity: 1, zIndex: 5, borderRadius: 32, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 400, y: 960, width: 520, height: 32, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, textAlign: "right", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 400, y: 996, width: 520, height: 28, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 400, textAlign: "right", verticalAlign: "top", colorRole: "text" },
          ],
        },
        portrait: {
          objects: [
            { id: "eyebrow", type: "text", name: "eyebrow", x: 80, y: 160, width: 920, height: 40, opacity: 0.85, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 28, fontWeight: 600, textAlign: "left", verticalAlign: "top", colorRole: "primary", previewText: "Let's get started!" },
            { id: "title", type: "text", name: "title", x: 80, y: 240, width: 920, height: 380, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 96, fontWeight: 800, lineHeight: 1.1, textAlign: "left", verticalAlign: "top", colorRole: "text", accentMarkup: true, accentColorRole: "primary", previewText: "Ready to *ship*?", textFit: false },
            { id: "cta_paragraph", type: "text", name: "paragraph", x: 80, y: 660, width: 920, height: 220, opacity: 0.9, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 34, fontWeight: 400, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", colorRole: "text", previewText: "Follow for more like this." },
            { id: "cta_button", type: "text", name: "cta", x: 80, y: 940, width: 300, height: 72, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 28, fontWeight: 700, textAlign: "center", verticalAlign: "center", color: "#FFFFFF", backgroundColorRole: "primary", borderRadius: 999, paddingX: 32, paddingY: 18, previewText: "Follow →" },
            { id: "signature_avatar", type: "visual", name: "avatar", x: 928, y: 1230, width: 72, height: 72, opacity: 1, zIndex: 5, borderRadius: 36, objectFit: "cover" },
            { id: "signature_name", type: "text", name: "name", x: 400, y: 1232, width: 512, height: 32, opacity: 1, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 22, fontWeight: 600, textAlign: "right", verticalAlign: "top", colorRole: "text" },
            { id: "signature_title", type: "text", name: "title", x: 400, y: 1270, width: 512, height: 28, opacity: 0.7, zIndex: 5, fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: 400, textAlign: "right", verticalAlign: "top", colorRole: "text" },
          ],
        },
      },
    },
  },
};

export function getCanvasDefaultConfig(name: string): CanvasTemplateConfig | null {
  return CANVAS_DEFAULTS[name]?.config ?? null;
}
