import { FileDown, Film, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import DraggableWallBox from "../components/DraggableWallBox";
import FloatingComposer from "../components/FloatingComposer";
import HiddenAdminPanel from "../components/HiddenAdminPanel";
import TagCard from "../components/TagCard";
import { exportWallPdf, exportWallVideo } from "../lib/exportWall";
import { getTags, saveTagPlacement } from "../lib/tags";
import { supabase } from "../lib/supabase";
import type { TagRecord } from "../lib/types";
import {
  buildWallLayout,
  getDensityScale,
  WALL_HEIGHT,
  WALL_WIDTH,
} from "../lib/wallLayout";

type ManualPlacement = {
  x: number;
  y: number;
  zIndex: number;
};

type WallBoxPosition = {
  x: number;
  y: number;
};

const WALL_BOX_STORAGE_KEY = "birthdayranger-wall-boxes-v2";
const WALL_MARGIN = 0;

const DEFAULT_WALL_BOX_POSITIONS: Record<"plaque" | "dedication", WallBoxPosition> = {
  plaque: { x: 22, y: 28 },
  dedication: { x: 660, y: 24 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function WallPage() {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focusedTag, setFocusedTag] = useState<TagRecord | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [viewportHeight, setViewportHeight] = useState(1080);
  const [exporting, setExporting] = useState<"pdf" | "video" | null>(null);
  const [dragPlacements, setDragPlacements] = useState<Record<string, ManualPlacement>>({});
  const [wallBoxes, setWallBoxes] = useState<Record<"plaque" | "dedication", WallBoxPosition>>(DEFAULT_WALL_BOX_POSITIONS);
  const exportSurfaceRef = useRef<HTMLDivElement>(null);

  const densityScale = getDensityScale(tags.length);
  const displayScale = fitScale;
  const scaledCanvasHeight = WALL_HEIGHT * displayScale;

  const basePlacements = useMemo(() => buildWallLayout(tags), [tags]);

  const placements = useMemo(() => {
    const merged = new Map(basePlacements);

    tags.forEach((tag) => {
      const base = basePlacements.get(tag.id);
      if (!base) return;

      const savedX = typeof tag.layout_x === "number" ? tag.layout_x : null;
      const savedY = typeof tag.layout_y === "number" ? tag.layout_y : null;
      const savedZ = typeof tag.layout_z === "number" ? tag.layout_z : base.zIndex;

      if (savedX !== null && savedY !== null) {
        merged.set(tag.id, {
          ...base,
          x: savedX,
          y: savedY,
          zIndex: savedZ,
        });
      }

      const dragging = dragPlacements[tag.id];
      if (dragging) {
        const current = merged.get(tag.id) ?? base;
        merged.set(tag.id, {
          ...current,
          x: dragging.x,
          y: dragging.y,
          zIndex: dragging.zIndex,
        });
      }
    });

    return merged;
  }, [basePlacements, dragPlacements, tags]);



  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WALL_BOX_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<Record<"plaque" | "dedication", WallBoxPosition>>;
      if (parsed && typeof parsed === "object") {
        setWallBoxes({
          plaque: parsed.plaque ?? DEFAULT_WALL_BOX_POSITIONS.plaque,
          dedication: parsed.dedication ?? DEFAULT_WALL_BOX_POSITIONS.dedication,
        });
      }
    } catch {
      // Ignore corrupted local wall-box data.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(WALL_BOX_STORAGE_KEY, JSON.stringify(wallBoxes));
    } catch {
      // Ignore storage quota/private-mode failures.
    }
  }, [wallBoxes]);

  useEffect(() => {
    function calculateFit() {
      const widthScale = window.innerWidth / WALL_WIDTH;
      const heightScale = window.innerHeight / WALL_HEIGHT;
      const viewportRatio = window.innerWidth / Math.max(window.innerHeight, 1);
      const wallRatio = WALL_WIDTH / WALL_HEIGHT;

      setFitScale(viewportRatio > wallRatio ? widthScale : Math.min(widthScale, heightScale));
      setViewportHeight(window.innerHeight);
    }

    calculateFit();
    window.addEventListener("resize", calculateFit);
    return () => window.removeEventListener("resize", calculateFit);
  }, []);

  useEffect(() => {
    let mounted = true;

    getTags()
      .then((data) => {
        if (mounted) setTags(data);
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the wall.",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const timer = window.setInterval(() => {
      getTags()
        .then((data) => setTags(data))
        .catch(() => undefined);
    }, 15000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("ranger2026-wall-shared-layout")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ranger2026_tags" },
        () => {
          getTags()
            .then((data) => setTags(data))
            .catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!focusedTag) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setFocusedTag(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [focusedTag]);

  function moveTag(tagId: string, next: { x: number; y: number }) {
    const placement = placements.get(tagId) ?? basePlacements.get(tagId);
    if (!placement) return;

    const x = clamp(
      next.x,
      WALL_MARGIN,
      WALL_WIDTH - placement.width - WALL_MARGIN,
    );

    const y = clamp(
      next.y,
      WALL_MARGIN,
      WALL_HEIGHT - placement.height - WALL_MARGIN,
    );

    setDragPlacements((current) => ({
      ...current,
      [tagId]: {
        x,
        y,
        zIndex: current[tagId]?.zIndex ?? placement.zIndex,
      },
    }));
  }

  async function finishMoveTag(tagId: string, next: { x: number; y: number }) {
    const placement = placements.get(tagId) ?? basePlacements.get(tagId);
    if (!placement) return;

    const x = clamp(
      next.x,
      WALL_MARGIN,
      WALL_WIDTH - placement.width - WALL_MARGIN,
    );

    const y = clamp(
      next.y,
      WALL_MARGIN,
      WALL_HEIGHT - placement.height - WALL_MARGIN,
    );

    const highestZ = tags.reduce((maxValue, tag) => {
      const currentPlacement = placements.get(tag.id) ?? basePlacements.get(tag.id);
      return Math.max(maxValue, currentPlacement?.zIndex ?? 0);
    }, 0);

    const zIndex = highestZ + 1;

    setDragPlacements((current) => ({
      ...current,
      [tagId]: { x, y, zIndex },
    }));

    try {
      const saved = await saveTagPlacement({ id: tagId, x, y, zIndex });

      setTags((current) =>
        current.map((tag) =>
          tag.id === tagId
            ? {
                ...tag,
                layout_x: saved.layout_x,
                layout_y: saved.layout_y,
                layout_z: saved.layout_z,
              }
            : tag,
        ),
      );

      setDragPlacements((current) => {
        const nextPlacements = { ...current };
        delete nextPlacements[tagId];
        return nextPlacements;
      });
    } catch (saveError) {
      setDragPlacements((current) => {
        const nextPlacements = { ...current };
        delete nextPlacements[tagId];
        return nextPlacements;
      });

      window.alert(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this tag position.",
      );
    }
  }

  function moveWallBox(box: "plaque" | "dedication", next: WallBoxPosition) {
    const widths = { plaque: 390, dedication: 600 } as const;
    const heights = { plaque: 190, dedication: 250 } as const;

    setWallBoxes((current) => ({
      ...current,
      [box]: {
        x: clamp(next.x, 0, WALL_WIDTH - widths[box]),
        y: clamp(next.y, 0, WALL_HEIGHT - heights[box]),
      },
    }));
  }

  async function runExport(kind: "pdf" | "video") {
    const surface = exportSurfaceRef.current;
    if (!surface || exporting) return;

    try {
      setExporting(kind);

      if (kind === "pdf") {
        await exportWallPdf(surface);
      } else {
        await exportWallVideo(
          surface,
          tags.map((tag) => ({
            id: tag.id,
            createdAt: tag.created_at,
          })),
        );
      }
    } catch (exportError) {
      window.alert(
        exportError instanceof Error
          ? exportError.message
          : "Could not export the wall.",
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <main className="wall-page">
      <div
        className="wall-viewport"
        style={{ minHeight: `${Math.max(viewportHeight, scaledCanvasHeight)}px` }}
      >
        <div
          className="wall-canvas"
          style={{
            transform: `translateX(-50%) scale(${displayScale})`,
          }}
        >
          <div className="wall-export-surface" ref={exportSurfaceRef}>
            <DraggableWallBox
              className="birthday-corner-tag"
              position={wallBoxes.plaque}
              scale={displayScale}
              onMove={(next) => moveWallBox("plaque", next)}
              title="Drag to move the Ranger2026 plaque"
            >
              <div className="birthday-corner-tag__eyebrow">
                <Sparkles size={13} />
                RANGER2026
              </div>

              <strong>HAPPY BIRTHDAY.</strong>

              <p>
                This wall belongs to Ranger&apos;s people. Leave a birthday tag,
                roast him, post a photo, or just make your mark.
              </p>
            </DraggableWallBox>

            <DraggableWallBox
              className="birthday-dedication"
              position={wallBoxes.dedication}
              scale={displayScale}
              onMove={(next) => moveWallBox("dedication", next)}
              title="Drag to move Ranger's birthday dedication"
            >
              <h1>FOR RANGER, HAVE A VERY VERY HAPPY FUCKING BIRTHDAY.</h1>

              <p>
                You&apos;re loved more than you know by everyone here.
              </p>

              <a
                className="resort-discord-link"
                href="https://discord.gg/qr6FTrWsGA"
                target="_blank"
                rel="noreferrer"
              >
                <span className="resort-discord-link__mark">R</span>

                <span className="resort-discord-link__copy">
                  <small>COME HOME TO</small>
                  <strong>THE RESORT</strong>
                </span>

                <span className="resort-discord-link__arrow">↗</span>
              </a>
            </DraggableWallBox>

            {loading && <div className="wall-status">Loading the wall...</div>}

            {!loading && error && (
              <div className="wall-status wall-status--error">{error}</div>
            )}

            {!loading && !error && tags.length === 0 && (
              <div className="wall-status">Clean wall. Somebody fix that.</div>
            )}

            <section className="tag-layer" aria-label="Ranger birthday graffiti wall">
              {tags.map((tag, index) => {
                const placement = placements.get(tag.id);
                if (!placement) return null;

                return (
                  <TagCard
                    key={tag.id}
                    tag={tag}
                    index={index}
                    placement={placement}
                    densityScale={densityScale}
                    dragScale={displayScale}
                    onOpen={setFocusedTag}
                    onMove={moveTag}
                    onMoveEnd={(tagId, next) => void finishMoveTag(tagId, next)}
                  />
                );
              })}
            </section>

            <footer className="wall-footer">
              <span>made for Ranger by his friends</span>
              <span>•</span>
              <span>ranger.unfilteredlog.com</span>
            </footer>
          </div>
        </div>
      </div>

      <FloatingComposer
        onCreated={(tag) => {
          setTags((current) => [...current, tag]);
        }}
      />

      <HiddenAdminPanel
        tags={tags}
        onDeleted={(id) => {
          setTags((current) => current.filter((tag) => tag.id !== id));
          setFocusedTag((current) => (current?.id === id ? null : current));
        }}
      />

      <div className="export-toolbar" aria-label="Wall export tools">
        <button
          type="button"
          onClick={() => void runExport("pdf")}
          disabled={Boolean(exporting)}
        >
          <FileDown size={15} />
          {exporting === "pdf" ? "BUILDING PDF..." : "EXPORT PDF"}
        </button>

        <button
          type="button"
          onClick={() => void runExport("video")}
          disabled={Boolean(exporting)}
        >
          <Film size={15} />
          {exporting === "video" ? "RENDERING 72H VIDEO..." : "EXPORT 72H VIDEO"}
        </button>
      </div>

      {focusedTag && (
        <div className="tag-focus" role="dialog" aria-modal="true">
          <button
            type="button"
            className="tag-focus__backdrop"
            onClick={() => setFocusedTag(null)}
            aria-label="Close enlarged tag"
          />

          <div className="tag-focus__content">
            <button
              type="button"
              className="tag-focus__close"
              onClick={() => setFocusedTag(null)}
              aria-label="Close enlarged tag"
            >
              <X size={18} />
            </button>

            <TagCard
              tag={focusedTag}
              index={tags.findIndex((tag) => tag.id === focusedTag.id)}
              mode="focus"
            />
          </div>
        </div>
      )}
    </main>
  );
}
