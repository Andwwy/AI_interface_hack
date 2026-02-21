"use client";

import { useState, useEffect, useRef, useMemo } from "react";

const FALLBACK: [string, string, string] = ["#667788", "#556677", "#445566"];

export function useColorExtractor(
  imageUrls: string[]
): [string, string, string][] {
  const [colors, setColors] = useState<[string, string, string][]>([]);
  const cacheRef = useRef<Map<string, [string, string, string]>>(new Map());
  const urlKey = useMemo(() => imageUrls.join("|"), [imageUrls]);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setColors([]);
      return;
    }

    let cancelled = false;

    const extract = async () => {
      const results = await Promise.all(
        imageUrls.map((url) => extractTopColors(url, cacheRef.current))
      );
      if (!cancelled) setColors(results);
    };

    extract();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);

  return colors;
}

async function extractTopColors(
  url: string,
  cache: Map<string, [string, string, string]>
): Promise<[string, string, string]> {
  if (cache.has(url)) return cache.get(url)!;

  try {
    const result = await new Promise<[string, string, string]>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      const timeout = setTimeout(() => resolve(FALLBACK), 4000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          const size = 32;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve(FALLBACK);
            return;
          }

          ctx.drawImage(img, 0, 0, size, size);

          let data: Uint8ClampedArray;
          try {
            data = ctx.getImageData(0, 0, size, size).data;
          } catch {
            resolve(FALLBACK);
            return;
          }

          const buckets = new Map<
            string,
            { r: number; g: number; b: number; count: number }
          >();

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a < 128) continue;

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum < 15 || lum > 245) continue;

            const qr = Math.round(r / 32) * 32;
            const qg = Math.round(g / 32) * 32;
            const qb = Math.round(b / 32) * 32;
            const key = `${qr},${qg},${qb}`;

            const existing = buckets.get(key);
            if (existing) {
              existing.r += r;
              existing.g += g;
              existing.b += b;
              existing.count++;
            } else {
              buckets.set(key, { r, g, b, count: 1 });
            }
          }

          if (buckets.size === 0) {
            resolve(FALLBACK);
            return;
          }

          const sorted = Array.from(buckets.values()).sort(
            (a, b) => b.count - a.count
          );

          const picked: [number, number, number][] = [];
          for (const bucket of sorted) {
            const cr = Math.round(bucket.r / bucket.count);
            const cg = Math.round(bucket.g / bucket.count);
            const cb = Math.round(bucket.b / bucket.count);

            const tooSimilar = picked.some(([pr, pg, pb]) => {
              const dr = cr - pr,
                dg = cg - pg,
                db = cb - pb;
              return Math.sqrt(dr * dr + dg * dg + db * db) < 60;
            });

            if (!tooSimilar) {
              picked.push([cr, cg, cb]);
              if (picked.length === 3) break;
            }
          }

          while (picked.length < 3) {
            if (sorted.length > picked.length) {
              const b = sorted[picked.length];
              picked.push([
                Math.round(b.r / b.count),
                Math.round(b.g / b.count),
                Math.round(b.b / b.count),
              ]);
            } else {
              picked.push(picked[0] || [102, 119, 136]);
            }
          }

          resolve([
            rgbToHex(...picked[0]),
            rgbToHex(...picked[1]),
            rgbToHex(...picked[2]),
          ]);
        } catch {
          resolve(FALLBACK);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(FALLBACK);
      };

      img.src = url;
    });

    cache.set(url, result);
    return result;
  } catch {
    return FALLBACK;
  }
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
