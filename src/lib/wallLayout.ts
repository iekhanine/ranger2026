import type { TagRecord } from "./types";

export const WALL_WIDTH = 1920;
export const WALL_HEIGHT = 1080;

export type TagPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
};

type Rect = TagPlacement;

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function intersectionArea(a: Rect, b: Rect) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function overlapRatio(a: Rect, b: Rect) {
  const overlap = intersectionArea(a, b);
  if (overlap === 0) return 0;

  return overlap / Math.min(a.width * a.height, b.width * b.height);
}

function estimateSize(tag: TagRecord) {
  const messageLength = tag.message.trim().length;
  const lineCount = Math.max(1, tag.message.trim().split(/\r?\n/).length);
  const textPressure = messageLength + Math.max(0, lineCount - 1) * 38;

  // Keep the wall dense. A post should look like graffiti, not a poster.
  // Long posts get a little more room, but text fitting does the heavy lifting.
  const width = Math.min(470, 235 + Math.min(235, textPressure * 0.52));
  const height = Math.min(
    390,
    118 + Math.min(165, Math.ceil(textPressure / 150) * 24) + (tag.media_url ? 88 : 0),
  );

  return { width, height };
}

export function getDensityScale(tagCount: number) {
  // Keep the wall crowded without making short messages unreadably tiny.
  // Density still tightens as the wall fills, but it never crushes a tag
  // below roughly three-quarters of its authored size.
  if (tagCount <= 8) return 1;
  if (tagCount <= 16) return 0.95;
  if (tagCount <= 24) return 0.90;
  if (tagCount <= 36) return 0.84;
  if (tagCount <= 50) return 0.79;

  return Math.max(0.74, 0.79 - (tagCount - 50) * 0.0015);
}

export function buildWallLayout(tags: TagRecord[]) {
  const placements = new Map<string, TagPlacement>();
  const occupied: Rect[] = [
    // Keep the Ranger2026 box readable on the far-left side.
    {
      x: 20,
      y: 24,
      width: 390,
      height: 190,
      rotation: 0,
      zIndex: 1,
    },

    // Keep Ranger's main dedication at the top-center by default so
    // the wall naturally wraps tags around it.
    {
      x: 625,
      y: 18,
      width: 670,
      height: 275,
      rotation: 0,
      zIndex: 1,
    },
  ];

  tags.forEach((tag, index) => {
    const random = mulberry32(hashString(tag.id));
    const { width, height } = estimateSize(tag);
    const margin = 38;

    let best: TagPlacement | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < 70; attempt += 1) {
      const candidate: TagPlacement = {
        x: margin + random() * (WALL_WIDTH - width - margin * 2),
        y: margin + random() * (WALL_HEIGHT - height - margin * 2),
        width,
        height,
        rotation: -7 + random() * 14,
        zIndex: 10 + (index % 30),
      };

      let score = 0;
      let worstOverlap = 0;

      for (const existing of occupied) {
        const ratio = overlapRatio(candidate, existing);
        worstOverlap = Math.max(worstOverlap, ratio);
        score += ratio * ratio;
      }

      // Up to ~12% overlap gives us believable paint-over without hiding tags.
      if (worstOverlap <= 0.12) {
        best = candidate;
        break;
      }

      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (!best) return;

    placements.set(tag.id, best);
    occupied.push(best);
  });

  return placements;
}
