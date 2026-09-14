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
  const lineWeight = Math.min(4, Math.ceil(messageLength / 75));

  const width = Math.min(455, 270 + Math.min(185, messageLength * 1.45));
  const height = Math.min(
    330,
    122 + lineWeight * 24 + (tag.media_url ? 132 : 0),
  );

  return { width, height };
}

export function getDensityScale(tagCount: number) {
  if (tagCount <= 10) return 1;

  return Math.max(0.46, 1 - (tagCount - 10) * 0.018);
}

export function buildWallLayout(tags: TagRecord[]) {
  const placements = new Map<string, TagPlacement>();
  const occupied: Rect[] = [
    // Keep the birthday plaque readable in the upper-left corner.
    {
      x: 34,
      y: 32,
      width: 390,
      height: 170,
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
