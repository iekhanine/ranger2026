import { FileDown, Film, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import FloatingComposer from "../components/FloatingComposer";
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

export default function WallPage() {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focusedTag, setFocusedTag] = useState<TagRecord | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [exporting, setExporting] = useState<"pdf" | "video" | null>(null);
  const exportSurfaceRef = useRef<HTMLDivElement>(null);

  const densityScale = getDensityScale(tags.length);
  const wallCrowdScale = Math.max(
    0.82,
    1 - Math.max(0, tags.length - 18) * 0.004,
  );
  const placements = useMemo(() => buildWallLayout(tags), [tags]);

  useEffect(() => {
    function calculateFit() {
      setFitScale(
        Math.min(
          window.innerWidth / WALL_WIDTH,
          window.innerHeight / WALL_HEIGHT,
        ),
      );
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
      <div className="wall-viewport">
        <div
          className="wall-canvas"
          style={{
            transform: `translate(-50%, -50%) scale(${fitScale * wallCrowdScale})`,
          }}
        >
          <div className="wall-export-surface" ref={exportSurfaceRef}>
            <aside className="birthday-corner-tag">
              <div className="birthday-corner-tag__eyebrow">
                <Sparkles size={13} />
                RANGER2026
              </div>

              <strong>HAPPY FUCKING BIRTHDAY.</strong>

              <p>
                This wall belongs to Ranger&apos;s people. Leave a birthday tag,
                roast him, post a photo, or just make your mark.
              </p>
            </aside>

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
