"use client";

import { useEffect, useRef } from "react";
import { BASE_SCENE, COLS, ROWS, CELL, P, POSITIONS } from "./kitchen-scene-data";
import { KitchenCookSprite } from "./kitchen-cook-sprite";
import {
  deriveAnimPhase,
  type CookStep,
  type CookStatus,
} from "./kitchen-animation-state";

/**
 * KitchenScene3D — High-res NES-style pixel-art kitchen with animated cook.
 *
 * Base scene rendered via <canvas> (240×120 grid at 2px = 480×240px).
 * Overlay animations (flames, steam, ticket, error) are positioned divs.
 * Cook sprite walks between kitchen stations based on the active step.
 */

interface KitchenScene3DProps {
  activeStep: CookStep | null;
  status: CookStatus;
}

export function KitchenScene3D({ activeStep, status }: KitchenScene3DProps) {
  const phase = deriveAnimPhase(activeStep, status);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const w = COLS * CELL;
  const h = ROWS * CELL;

  // Draw static scene once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Run-length optimized drawing: merge horizontal spans of same color
    for (let r = 0; r < ROWS; r++) {
      let runStart = 0;
      let runColor = BASE_SCENE[r][0];
      for (let c = 1; c <= COLS; c++) {
        const color = c < COLS ? BASE_SCENE[r][c] : null;
        if (color !== runColor) {
          if (runColor) {
            ctx.fillStyle = runColor;
            ctx.fillRect(runStart * CELL, r * CELL, (c - runStart) * CELL, CELL);
          }
          runStart = c;
          runColor = color;
        }
      }
    }
  }, []);

  return (
    <>
      <style>{`
        .ks3-wrap {
          overflow: hidden;
          border: 2px solid var(--color-brand, #4A3326);
          background: ${P.wall};
          box-shadow: 4px 4px 0 var(--color-brand, #4A3326);
        }
        .ks3-viewport {
          position: relative;
          width: 100%;
          aspect-ratio: ${w} / ${h};
        }
        .ks3-scene {
          position: absolute;
          inset: 0;
          width: ${w}px;
          height: ${h}px;
          transform-origin: top left;
          image-rendering: pixelated;
        }
        .ks3-container {
          container-type: inline-size;
        }
        @container (min-width: 0px) {
          .ks3-scene { transform: scale(calc(100cqw / ${w})); }
        }

        /* ── Flame animation (2-frame alternating) ── */
        @keyframes ks3-flame-a {
          0%, 49.9% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes ks3-flame-b {
          0%, 49.9% { opacity: 0; }
          50%, 100% { opacity: 1; }
        }

        /* ── Steam rise ── */
        @keyframes ks3-rise {
          0% { opacity: 0.7; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-40px); }
        }

        /* ── Ticket drop ── */
        @keyframes ks3-ticket-drop {
          0% { opacity: 0; transform: translateY(-30px); }
          15% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(0); }
        }

        /* ── Error pulse ── */
        @keyframes ks3-err-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .ks3-anim { animation: none !important; }
        }
      `}</style>

      <div className="ks3-container">
        <div className="ks3-wrap">
          <div className="ks3-viewport">
            <div className="ks3-scene">
              {/* Base scene (static, rendered to canvas) */}
              <canvas
                ref={canvasRef}
                width={w}
                height={h}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: w,
                  height: h,
                  imageRendering: "pixelated",
                }}
              />

              {/* Cook character */}
              <KitchenCookSprite
                targetX={phase.targetX}
                anim={phase.cookAnim}
                cellSize={CELL}
                stationSide={phase.targetX < POSITIONS.CENTER ? "left" : "right"}
              />

              {/* ── Oven flames ── */}
              {phase.showFlames && <OvenFlames />}

              {/* ── Steam wisps ── */}
              {phase.showSteam && <SteamWisps />}

              {/* ── ORDER UP ticket ── */}
              {phase.showDone && <OrderUpTicket />}

              {/* ── Error X ── */}
              {phase.showError && <ErrorX />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Overlay components ─────────────────────────────────────────────────────

/** Two-frame alternating flames inside the oven glass area */
function OvenFlames() {
  // Oven glass: sx=68, ody=46, glass starts ~gy=54, inner at ~56
  // Bottom of glass cavity for flames
  const ox = 78;
  const oy = 80; // near bottom of glass area in shorter oven

  const flamePositions = [
    // 4 flame clusters for fuller fire
    { x: ox, y: oy, w: 4, h: 4, c: P.flameOuter },
    { x: ox + 6, y: oy, w: 4, h: 4, c: P.flameOuter },
    { x: ox + 12, y: oy, w: 4, h: 4, c: P.flameOuter },
    { x: ox + 3, y: oy - 1, w: 4, h: 3, c: P.flameOuter },
    // Mid flames (taller)
    { x: ox + 1, y: oy - 3, w: 3, h: 3, c: P.flameMid },
    { x: ox + 7, y: oy - 4, w: 3, h: 4, c: P.flameMid },
    { x: ox + 13, y: oy - 3, w: 2, h: 3, c: P.flameMid },
    { x: ox + 4, y: oy - 2, w: 2, h: 2, c: P.flameMid },
    // Core tips
    { x: ox + 2, y: oy - 5, w: 1, h: 2, c: P.flameCore },
    { x: ox + 8, y: oy - 6, w: 2, h: 2, c: P.flameCore },
    { x: ox + 13, y: oy - 5, w: 1, h: 2, c: P.flameCore },
  ];

  const flameBPositions = [
    // Shifted flame clusters
    { x: ox + 2, y: oy, w: 4, h: 4, c: P.flameOuter },
    { x: ox + 8, y: oy, w: 4, h: 4, c: P.flameOuter },
    { x: ox + 14, y: oy, w: 3, h: 4, c: P.flameOuter },
    { x: ox + 5, y: oy - 1, w: 3, h: 3, c: P.flameOuter },
    // Mid flames
    { x: ox + 3, y: oy - 4, w: 3, h: 4, c: P.flameMid },
    { x: ox + 9, y: oy - 3, w: 3, h: 3, c: P.flameMid },
    { x: ox + 1, y: oy - 2, w: 2, h: 2, c: P.flameMid },
    { x: ox + 14, y: oy - 2, w: 2, h: 2, c: P.flameMid },
    // Core tips
    { x: ox + 4, y: oy - 6, w: 1, h: 2, c: P.flameCore },
    { x: ox + 10, y: oy - 5, w: 2, h: 2, c: P.flameCore },
    { x: ox + 2, y: oy - 4, w: 1, h: 1, c: P.flameCore },
  ];

  return (
    <>
      <div className="ks3-anim" style={{ animation: "ks3-flame-a 0.3s steps(1) infinite", position: "absolute", inset: 0, zIndex: 10 }}>
        {flamePositions.map((f, i) => (
          <div key={i} style={{
            position: "absolute",
            left: f.x * CELL,
            top: f.y * CELL,
            width: f.w * CELL,
            height: f.h * CELL,
            backgroundColor: f.c,
          }} />
        ))}
      </div>
      <div className="ks3-anim" style={{ animation: "ks3-flame-b 0.3s steps(1) infinite", position: "absolute", inset: 0, zIndex: 10 }}>
        {flameBPositions.map((f, i) => (
          <div key={i} style={{
            position: "absolute",
            left: f.x * CELL,
            top: f.y * CELL,
            width: f.w * CELL,
            height: f.h * CELL,
            backgroundColor: f.c,
          }} />
        ))}
      </div>
    </>
  );
}

/** Rising steam wisps above the pot on the stove */
function SteamWisps() {
  // Pot sits above oven at roughly x=75, y=22
  const wisps = [
    { x: 78, delay: 0 },
    { x: 82, delay: 0.5 },
    { x: 86, delay: 1.0 },
  ];

  return (
    <>
      {wisps.map((w, i) => (
        <div
          key={i}
          className="ks3-anim"
          style={{
            position: "absolute",
            left: w.x * CELL,
            top: 18 * CELL,
            width: 4 * CELL,
            height: 4 * CELL,
            borderRadius: "50%",
            backgroundColor: P.steamLight,
            animation: `ks3-rise 2s ease-out ${w.delay}s infinite`,
            zIndex: 12,
          }}
        />
      ))}
    </>
  );
}

/** "ORDER UP!" ticket dropping from top */
function OrderUpTicket() {
  return (
    <div
      className="ks3-anim"
      style={{
        position: "absolute",
        top: "15%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        padding: `${CELL}px ${CELL * 3}px`,
        backgroundColor: P.brand,
        border: `2px solid ${P.gold}`,
        boxShadow: `3px 3px 0 ${P.brand}`,
        animation: "ks3-ticket-drop 3s ease-out forwards",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-press-start)",
          fontSize: "10px",
          color: P.gold,
          whiteSpace: "nowrap",
        }}
      >
        ORDER UP!
      </span>
    </div>
  );
}

/** Pulsing red X over the oven area */
function ErrorX() {
  // Center on the oven door area
  const ox = 82;
  const oy = 40;
  const size = 16;

  const cells: { x: number; y: number; c: string }[] = [];
  for (let i = 0; i < size; i++) {
    cells.push({ x: ox + i, y: oy + i, c: P.errorRed });
    cells.push({ x: ox + i + 1, y: oy + i, c: P.errorRed });
    cells.push({ x: ox + size - 1 - i, y: oy + i, c: P.errorDark });
    cells.push({ x: ox + size - i, y: oy + i, c: P.errorDark });
  }

  return (
    <div
      className="ks3-anim"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 18,
        animation: "ks3-err-pulse 1s ease-in-out infinite",
      }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.x * CELL,
            top: c.y * CELL,
            width: CELL,
            height: CELL,
            backgroundColor: c.c,
          }}
        />
      ))}
    </div>
  );
}
