import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import TagCard from "../components/TagCard";
import TagComposer from "../components/TagComposer";
import { getTags } from "../lib/tags";
import type { TagRecord } from "../lib/types";

export default function WallPage() {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <main className="wall-page">
      <section className="wall-stage">
        <aside className="birthday-corner-tag">
          <div className="birthday-corner-tag__eyebrow">
            <Sparkles size={11} />
            RANGER2026
          </div>

          <strong>HAPPY FUCKING BIRTHDAY.</strong>

          <p>
            This wall belongs to Ranger&apos;s people. Leave a birthday tag,
            roast him, post a photo, or just make your mark.
          </p>
        </aside>

        <div className="wall-compose">
          <TagComposer
            onCreated={(tag) => {
              setTags((current) => [...current, tag]);
            }}
          />
        </div>

        <section className="graffiti-field" aria-label="Ranger birthday graffiti wall">
          {loading && <div className="wall-status">Loading the wall...</div>}

          {!loading && error && (
            <div className="wall-status wall-status--error">{error}</div>
          )}

          {!loading && !error && tags.length === 0 && (
            <div className="wall-status">Clean wall. Somebody fix that.</div>
          )}

          <div className="tag-layer">
            {tags.map((tag, index) => (
              <TagCard key={tag.id} tag={tag} index={index} />
            ))}
          </div>
        </section>

        <footer className="wall-footer">
          <span>made for Ranger by his friends</span>
          <span>•</span>
          <a href="https://ivansays.com">ivansays.com</a>
        </footer>
      </section>
    </main>
  );
}
