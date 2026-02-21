"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";

interface LiquidGradientProps {
  colors: [string, string, string];
}

const TRANSITION_MS = 1800;

export function LiquidGradient({ colors }: LiquidGradientProps) {
  const [c1, c2, c3] = colors;
  const rootRef = useRef<HTMLDivElement>(null);

  const targetPalette = useMemo(
    () => derivePaletteFrom3(c1, c2, c3),
    [c1, c2, c3]
  );
  const targetBase = useMemo(() => {
    const { h, s, l } = hexToHsl(c1 || "#555577");
    return hslToHex(
      h,
      Math.round(s * 0.55),
      Math.round(l + (100 - l) * 0.18)
    );
  }, [c1]);

  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const fromPaletteRef = useRef<number[][]>(targetPalette.map(hexToRgbArr));
  const fromBaseRef = useRef<number[]>(hexToRgbArr(targetBase));
  const toPaletteRef = useRef<number[][]>(targetPalette.map(hexToRgbArr));
  const toBaseRef = useRef<number[]>(hexToRgbArr(targetBase));
  const currentPaletteRef = useRef<number[][]>(targetPalette.map(hexToRgbArr));
  const currentBaseRef = useRef<number[]>(hexToRgbArr(targetBase));
  const isFirstRef = useRef(true);

  const applyRgb = useCallback(
    (palette: number[][], base: number[]) => {
      const el = rootRef.current;
      if (!el) return;
      for (let i = 0; i < palette.length; i++) {
        el.style.setProperty(
          `--p${i}`,
          `${palette[i][0]}, ${palette[i][1]}, ${palette[i][2]}`
        );
      }
      el.style.setProperty("--base", `${base[0]}, ${base[1]}, ${base[2]}`);
    },
    []
  );

  const animate = useCallback(
    (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const rawT = Math.min(elapsed / TRANSITION_MS, 1);
      const t =
        rawT < 0.5
          ? 4 * rawT * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      const from = fromPaletteRef.current;
      const to = toPaletteRef.current;
      const interpolated = to.map((toRgb, i) => {
        const fRgb = from[i] || toRgb;
        return lerpRgb(fRgb, toRgb, t);
      });
      const baseInterp = lerpRgb(
        fromBaseRef.current,
        toBaseRef.current,
        t
      );

      currentPaletteRef.current = interpolated;
      currentBaseRef.current = baseInterp;
      applyRgb(interpolated, baseInterp);

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = 0;
        fromPaletteRef.current = to;
        fromBaseRef.current = toBaseRef.current;
      }
    },
    [applyRgb]
  );

  useEffect(() => {
    const toP = targetPalette.map(hexToRgbArr);
    const toB = hexToRgbArr(targetBase);

    if (isFirstRef.current) {
      isFirstRef.current = false;
      fromPaletteRef.current = toP;
      fromBaseRef.current = toB;
      toPaletteRef.current = toP;
      toBaseRef.current = toB;
      currentPaletteRef.current = toP;
      currentBaseRef.current = toB;
      applyRgb(toP, toB);
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    fromPaletteRef.current = currentPaletteRef.current.map((a) => [...a]);
    fromBaseRef.current = [...currentBaseRef.current];
    toPaletteRef.current = toP;
    toBaseRef.current = toB;

    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPalette, targetBase]);

  const initialVars = useMemo(() => {
    const vars: Record<string, string> = {};
    targetPalette.forEach((hex, i) => {
      const { r, g, b } = hexToRgb(hex);
      vars[`--p${i}`] = `${r}, ${g}, ${b}`;
    });
    const { r, g, b } = hexToRgb(targetBase);
    vars["--base"] = `${r}, ${g}, ${b}`;
    return vars;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-0 overflow-hidden"
      style={initialVars as React.CSSProperties}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgb(var(--base))" }}
      />

      <div
        className="absolute gpu-layer"
        style={{
          inset: "-50%",
          background: conicGrad([0, 3, 1, 4, 2, 5, 6, 0], [0.8, 0.6]),
          animation: "rotate-wash 90s linear infinite",
          filter: "blur(120px)",
          opacity: 0.65,
        }}
      />

      <div
        className="absolute gpu-layer"
        style={{
          inset: "-45%",
          background: conicGradAlt([2, 6, 0, 5, 3, 1, 4, 2], 0.47),
          animation: "rotate-wash-reverse 75s linear infinite",
          filter: "blur(140px)",
          opacity: 0.4,
        }}
      />

      <div
        className="absolute inset-0"
        style={{ filter: "blur(100px) saturate(1.4)" }}
      >
        <div
          className="absolute gpu-layer"
          style={{
            left: "-10%",
            top: "-15%",
            width: "130vmax",
            height: "130vmax",
            borderRadius: "50%",
            background: radialField(0, 2, 4),
            animation: "drift-0 55s ease-in-out infinite",
          }}
        />
        <div
          className="absolute gpu-layer"
          style={{
            left: "50%",
            top: "-10%",
            width: "125vmax",
            height: "125vmax",
            borderRadius: "50%",
            background: radialField(1, 3, 5),
            animation: "drift-1 62s ease-in-out -14s infinite",
          }}
        />
        <div
          className="absolute gpu-layer"
          style={{
            left: "10%",
            top: "45%",
            width: "135vmax",
            height: "135vmax",
            borderRadius: "50%",
            background: radialField(3, 5, 0),
            animation: "drift-2 58s ease-in-out -28s infinite",
          }}
        />
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(var(--p0), 0.12) 0%, transparent 75%)",
          animation: "breathe 8s ease-in-out infinite",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: "128px 128px",
        }}
      />

      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.25) 100%)",
        }}
      />
    </div>
  );
}

function pVar(idx: number, alpha: number): string {
  return `rgba(var(--p${idx}), ${alpha})`;
}

function conicGrad(indices: number[], alphas: [number, number]): string {
  const stops = indices
    .map((idx, i) => pVar(idx, i % 2 === 0 ? alphas[0] : alphas[1]))
    .join(", ");
  return `conic-gradient(from 0deg at 50% 50%, ${stops})`;
}

function conicGradAlt(indices: number[], alpha: number): string {
  const stops = indices.map((idx) => pVar(idx, alpha)).join(", ");
  return `conic-gradient(from 180deg at 45% 55%, ${stops})`;
}

function radialField(a: number, b: number, c: number): string {
  return `radial-gradient(ellipse at center, ${pVar(a, 0.5)} 0%, ${pVar(b, 0.2)} 30%, ${pVar(c, 0.06)} 55%, transparent 75%)`;
}

function derivePaletteFrom3(
  hex1: string,
  hex2: string,
  hex3: string
): string[] {
  const { h: h1, s: s1, l: l1 } = hexToHsl(hex1);
  const { h: h2, s: s2, l: l2 } = hexToHsl(hex2);
  const { h: h3, s: s3, l: l3 } = hexToHsl(hex3);

  const sat = (s: number) => clamp(Math.round(s * 0.78), 0, 100);
  const lift = (l: number) => clamp(Math.round(l + (100 - l) * 0.22), 0, 100);

  return [
    hslToHex(h1, sat(s1), lift(l1)),
    hslToHex(h2, sat(s2), lift(l2)),
    hslToHex(h3, sat(s3), lift(l3)),
    hslToHex(midHue(h1, h2), sat(avg(s1, s2)), lift(avg(l1, l2))),
    hslToHex(midHue(h2, h3), sat(avg(s2, s3)), lift(avg(l2, l3))),
    hslToHex(h1, sat(clamp(s1 + 15, 0, 100)), lift(clamp(l1 + 8, 0, 95))),
    hslToHex(h3, sat(clamp(s3 + 10, 0, 100)), lift(clamp(l3 - 12, 5, 100))),
  ];
}

function avg(a: number, b: number) {
  return Math.round((a + b) / 2);
}
function midHue(a: number, b: number) {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff / 2) + 360) % 360;
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
}
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) =>
        Math.min(255, Math.max(0, c))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}
function hexToHsl(hex: string) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100,
    lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return lN - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return rgbToHex(
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255)
  );
}
function hexToRgbArr(hex: string): number[] {
  const { r, g, b } = hexToRgb(hex);
  return [r, g, b];
}
function lerpRgb(from: number[], to: number[], t: number): number[] {
  return [
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t),
  ];
}
