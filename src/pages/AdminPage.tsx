import { LogIn, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteTag, getTags } from "../lib/tags";
import { supabase } from "../lib/supabase";
import type { TagRecord } from "../lib/types";

export default function AdminPage() {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setSignedIn(Boolean(user));

      if (user) {
        setTags(await getTags());
      } else {
        setTags([]);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load admin.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();

    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check your email for the admin sign-in link.");
  }

  async function remove(id: string) {
    const confirmed = window.confirm("Remove this tag from the wall?");
    if (!confirmed) return;

    try {
      await deleteTag(id);
      setTags((current) => current.filter((tag) => tag.id !== id));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to remove tag.",
      );
    }
  }

  if (loading) {
    return <main className="admin-shell">Loading...</main>;
  }

  if (!signedIn) {
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <ShieldCheck size={34} />
          <h1>RANGER 2026 Admin</h1>
          <p>
            Sign in with an authorized email address to moderate the wall.
          </p>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <button type="button" onClick={signIn}>
            <LogIn size={16} />
            Send magic link
          </button>

          {message && <div className="admin-message">{message}</div>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <div className="admin-toolbar">
        <div>
          <span>RANGER 2026</span>
          <h1>Wall Moderation</h1>
        </div>

        <button
          type="button"
          className="admin-secondary"
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <div className="admin-list">
        {tags.map((tag) => (
          <article className="admin-item" key={tag.id}>
            {tag.media_url && (
              <img src={tag.media_url} alt="" className="admin-item__image" />
            )}

            <div className="admin-item__body">
              <strong>{tag.name}</strong>
              <p>{tag.message}</p>
              <small>{new Date(tag.created_at).toLocaleString()}</small>
            </div>

            <button
              type="button"
              className="admin-delete"
              onClick={() => void remove(tag.id)}
              aria-label={`Delete post by ${tag.name}`}
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
