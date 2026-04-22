"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHEF_FRAMES,
  getSheetFrame,
  KITCHEN_SCENE,
  KITCHEN_STATIONS,
  type ChefPose,
  type KitchenStation,
} from "./kitchen-scene-assets";

interface KitchenCookSpriteProps {
  station: KitchenStation;
  pose: ChefPose;
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export function KitchenCookSprite({ station, pose }: KitchenCookSpriteProps) {
  const reducedMotion = useReducedMotion();
  const [frameIdx, setFrameIdx] = useState(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [sheetImage, setSheetImage] = useState<HTMLImageElement | null>(null);
  const previousStationRef = useRef<KitchenStation>(station);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new window.Image();
    image.decoding = "async";
    image.src = KITCHEN_SCENE.chefSheetSrc;
    image.onload = () => {
      if (!cancelled) setSheetImage(image);
    };
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next = KITCHEN_STATIONS[station];
    const previous = KITCHEN_STATIONS[previousStationRef.current];
    previousStationRef.current = station;

    const animationFrame = window.requestAnimationFrame(() => {
      setFacingLeft(next.x < previous.x);
      setIsMoving(!reducedMotion && (next.x !== previous.x || next.y !== previous.y));
    });

    if (reducedMotion) {
      return () => window.cancelAnimationFrame(animationFrame);
    }

    const timeout = window.setTimeout(() => {
      setIsMoving(false);
    }, 520);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
    };
  }, [reducedMotion, station]);

  const activePose = isMoving ? "walk" : pose;
  const frames = CHEF_FRAMES[activePose];

  useEffect(() => {
    setFrameIdx(0);
  }, [activePose]);

  useEffect(() => {
    if (reducedMotion || frames.length < 2) {
      return;
    }

    const speed = activePose === "walk" ? 180 : 420;
    const interval = window.setInterval(() => {
      setFrameIdx((current) => (current + 1) % frames.length);
    }, speed);

    return () => window.clearInterval(interval);
  }, [activePose, frames, reducedMotion]);

  const frame = useMemo(
    () => getSheetFrame(frames[frameIdx % frames.length]),
    [frameIdx, frames],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sheetImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sheetImage,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r < 18 && g < 18 && b < 18) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [frame, sheetImage]);

  const target = KITCHEN_STATIONS[station];
  const left = ((target.x - KITCHEN_SCENE.chef.renderWidth / 2) / KITCHEN_SCENE.width) * 100;
  const top = ((target.y - KITCHEN_SCENE.chef.renderHeight) / KITCHEN_SCENE.height) * 100;
  const width = (KITCHEN_SCENE.chef.renderWidth / KITCHEN_SCENE.width) * 100;
  const height = (KITCHEN_SCENE.chef.renderHeight / KITCHEN_SCENE.height) * 100;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        overflow: "hidden",
        zIndex: 3,
        transform: facingLeft ? "scaleX(-1)" : "none",
        transformOrigin: "center bottom",
        transition: reducedMotion ? "none" : "left 520ms ease, top 520ms ease",
        filter: "drop-shadow(0 12px 12px rgba(34, 24, 18, 0.18))",
      }}
    >
      <canvas
        ref={canvasRef}
        width={Math.round(KITCHEN_SCENE.chef.renderWidth)}
        height={Math.round(KITCHEN_SCENE.chef.renderHeight)}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          imageRendering: "auto",
        }}
      />
    </div>
  );
}
