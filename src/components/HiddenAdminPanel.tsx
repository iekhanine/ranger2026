import { LogOut, ShieldCheck, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  deleteTagWithCredentials,
  validateRangerAdmin,
} from "../lib/tags";
import type { TagRecord } from "../lib/types";

type HiddenAdminPanelProps = {
  tags: TagRecord[];
  onDeleted: (id: string) => void;
};

type AdminCredentials = {
  username: string;
  password: string;
};

export default function HiddenAdminPanel({
  tags,
  onDeleted,
}: HiddenAdminPanelProps) {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState<AdminCredentials>({
    username: "",
    password: "",
  });
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function closePanel() {
    setOpen(false);
    setMessage("");
  }

  function logOut() {
    setAuthenticated(false);
    setCredentials({ username: "", password: "" });
    setMessage("");
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const valid = await validateRangerAdmin(credentials);

      if (!valid) {
        setMessage("Nope. Wrong credentials.");
        return;
      }

      setAuthenticated(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not verify the admin credentials.",
      );
    }
  }

  async function remove(tag: TagRecord) {
    const confirmed = window.confirm(
      `Delete ${tag.name}'s post from Ranger's wall? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setWorkingId(tag.id);
      setMessage("");

      const deleted = await deleteTagWithCredentials(tag.id, credentials);

      if (!deleted) {
        setMessage("That post was already gone or could not be found.");
        return;
      }

      onDeleted(tag.id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete that post.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        className="hidden-admin-hotspot"
        onClick={() => setOpen(true)}
        aria-label="Open wall controls"
        title=""
      />

      {open && (
        <div className="hidden-admin-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="hidden-admin-backdrop"
            onClick={closePanel}
            aria-label="Close wall controls"
          />

          {!authenticated ? (
            <form className="hidden-admin-login" onSubmit={signIn}>
              <button
                type="button"
                className="hidden-admin-close"
                onClick={closePanel}
                aria-label="Close wall controls"
              >
                <X size={18} />
              </button>

              <ShieldCheck size={34} />
              <span className="hidden-admin-kicker">PRIVATE WALL CONTROL</span>
              <h2>Ranger moderation</h2>
              <p>Enter the wall credentials to manage birthday posts.</p>

              <label>
                <span>Username</span>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  autoComplete="username"
                  autoFocus
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  autoComplete="current-password"
                />
              </label>

              <button type="submit" className="hidden-admin-primary">
                Unlock moderation
              </button>

              {message && <div className="hidden-admin-message">{message}</div>}
            </form>
          ) : (
            <section className="hidden-admin-panel">
              <header className="hidden-admin-panel__header">
                <div>
                  <span className="hidden-admin-kicker">PRIVATE WALL CONTROL</span>
                  <h2>Ranger moderation</h2>
                  <p>{tags.length} post{tags.length === 1 ? "" : "s"} on the wall</p>
                </div>

                <div className="hidden-admin-panel__actions">
                  <button type="button" onClick={logOut}>
                    <LogOut size={15} />
                    Lock
                  </button>
                  <button
                    type="button"
                    className="hidden-admin-close"
                    onClick={closePanel}
                    aria-label="Close wall controls"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>

              {message && <div className="hidden-admin-message">{message}</div>}

              <div className="hidden-admin-list">
                {tags.length === 0 && (
                  <div className="hidden-admin-empty">Nothing to delete. The wall is clean.</div>
                )}

                {[...tags].reverse().map((tag) => (
                  <article className="hidden-admin-item" key={tag.id}>
                    {tag.media_url ? (
                      <img src={tag.media_url} alt="" />
                    ) : (
                      <div className="hidden-admin-item__placeholder">TAG</div>
                    )}

                    <div className="hidden-admin-item__copy">
                      <strong>{tag.name}</strong>
                      <p>{tag.message}</p>
                      <small>{new Date(tag.created_at).toLocaleString()}</small>
                    </div>

                    <button
                      type="button"
                      className="hidden-admin-delete"
                      onClick={() => void remove(tag)}
                      disabled={workingId === tag.id}
                      aria-label={`Delete post by ${tag.name}`}
                    >
                      <Trash2 size={16} />
                      {workingId === tag.id ? "Deleting..." : "Delete"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
