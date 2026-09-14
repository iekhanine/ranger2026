import { FileDown, Film, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import DraggableWallBox from "../components/DraggableWallBox";
import FloatingComposer from "../components/FloatingComposer";
import HiddenAdminPanel from "../components/HiddenAdminPanel";
import TagCard from "../components/TagCard";
import { exportWallPdf, exportWallVideo } from "../lib/exportWall";
import { getTags } from "../lib/tags";
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

const DRAG_LAYOUT_STORAGE_KEY = "birthdayranger-drag-layout-v2";
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
  const [manualPlacements, setManualPlacements] = useState<Record<string, ManualPlacement>>({});
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
      const manual = manualPlacements[tag.id];

      if (base && manual) {
        merged.set(tag.id, {
          ...base,
          x: manual.x,
          y: manual.y,
          zIndex: manual.zIndex,
        });
      }
    });

    return merged;
  }, [basePlacements, manualPlacements, tags]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAG_LAYOUT_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, ManualPlacement>;
      if (parsed && typeof parsed === "object") {
        setManualPlacements(parsed);
      }
    } catch {
      // Ignore corrupted local drag layout data.
    }
  }, []);

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
    const validIds = new Set(tags.map((tag) => tag.id));

    setManualPlacements((current) => {
      let changed = false;
      const next: Record<string, ManualPlacement> = {};

      Object.entries(current).forEach(([tagId, placement]) => {
        if (validIds.has(tagId)) {
          next[tagId] = placement;
        } else {
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [tags]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DRAG_LAYOUT_STORAGE_KEY,
        JSON.stringify(manualPlacements),
      );
    } catch {
      // Ignore storage quota/private-mode failures.
    }
  }, [manualPlacements]);

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

    setManualPlacements((current) => ({
      ...current,
      [tagId]: {
        x,
        y,
        zIndex: current[tagId]?.zIndex ?? placement.zIndex,
      },
    }));
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

  function bringTagToFront(tagId: string) {
    const placement = placements.get(tagId) ?? basePlacements.get(tagId);
    if (!placement) return;

    setManualPlacements((current) => {
      const highestZ = tags.reduce((maxValue, tag) => {
        const manual = current[tag.id];
        const base = basePlacements.get(tag.id);
        const zIndex = manual?.zIndex ?? base?.zIndex ?? 0;
        return Math.max(maxValue, zIndex);
      }, 0);

      return {
        ...current,
        [tagId]: {
          x: current[tagId]?.x ?? placement.x,
          y: current[tagId]?.y ?? placement.y,
          zIndex: highestZ + 1,
        },
      };
    });
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
                    onOpen={setFocusedTag}
                    onMove={moveTag}
                    onMoveEnd={moveTag}
                    onBringToFront={bringTagToFront}
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
