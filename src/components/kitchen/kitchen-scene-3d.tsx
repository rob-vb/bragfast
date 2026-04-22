"use client";

import { KitchenCookSprite } from "./kitchen-cook-sprite";
import {
  deriveAnimPhase,
  type CookStep,
  type CookStatus,
} from "./kitchen-animation-state";
import { KITCHEN_SCENE } from "./kitchen-scene-assets";

interface KitchenScene3DProps {
  activeStep: CookStep | null;
  status: CookStatus;
}

export function KitchenScene3D({ activeStep, status }: KitchenScene3DProps) {
  const phase = deriveAnimPhase(activeStep, status);

  return (
    <>
      <style>{`
        .kitchen-scene-wrap {
          overflow: hidden;
          border: 2px solid var(--color-brand, #4A3326);
          background: #f4e5c9;
          box-shadow: 4px 4px 0 var(--color-brand, #4A3326);
        }
        .kitchen-scene-stage {
          position: relative;
          width: 100%;
          aspect-ratio: ${KITCHEN_SCENE.width} / ${KITCHEN_SCENE.height};
          background-image: url(${KITCHEN_SCENE.backgroundSrc});
          background-size: cover;
          background-position: center;
          overflow: hidden;
        }
        .kitchen-scene-stage::after {
          content: "";
          position: absolute;
          inset: auto 0 0;
          height: 22%;
          background: linear-gradient(to top, rgba(73, 51, 38, 0.12), rgba(73, 51, 38, 0));
          pointer-events: none;
        }
        .kitchen-scene-overlay {
          position: absolute;
          z-index: 4;
          font-family: var(--font-press-start), monospace;
          font-size: 10px;
          line-height: 1.6;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4A3326;
          background: rgba(255, 248, 240, 0.92);
          border: 2px solid #4A3326;
          box-shadow: 3px 3px 0 rgba(74, 51, 38, 0.85);
          padding: 8px 10px;
        }
        @keyframes ticket-drop {
          from { transform: translateY(-120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes cooking-dots {
          0%,  24% { content: "";    }
          25%, 49% { content: ".";   }
          50%, 74% { content: "..";  }
          75%,100% { content: "..."; }
        }
        .kitchen-scene-overlay--done {
          top: 12%;
          right: 8%;
          animation: ticket-drop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .kitchen-scene-overlay--error {
          top: 12%;
          left: 8%;
          color: #8f1d16;
          border-color: #8f1d16;
          box-shadow: 3px 3px 0 rgba(143, 29, 22, 0.75);
        }
        .kitchen-scene-overlay--cooking {
          top: 10%;
          right: 9%;
        }
        .kitchen-scene-overlay--cooking::after {
          content: "";
          animation: cooking-dots 2.4s steps(1, end) infinite;
        }
      `}</style>

      <div className="kitchen-scene-wrap">
        <div className="kitchen-scene-stage" aria-hidden="true">
          <KitchenCookSprite station={phase.station} pose={phase.pose} />

          {phase.accent === "cooking" ? (
            <div className="kitchen-scene-overlay kitchen-scene-overlay--cooking">
              Cooking
            </div>
          ) : null}

          {phase.accent === "done" ? (
            <div className="kitchen-scene-overlay kitchen-scene-overlay--done">
              Order Up!
            </div>
          ) : null}

          {phase.accent === "error" ? (
            <div className="kitchen-scene-overlay kitchen-scene-overlay--error">
              Burned
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
