import { LogOut, ShieldCheck, Trash2, ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getTags, validateRangerAdmin, deleteTagWithCredentials } from "../lib/tags";
import type { TagRecord } from "../lib/types";

type Credentials = { username: string; password: string };

export default function AdminPage() {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [credentials, setCredentials] = useState<Credentials>({ username: "", password: "" });
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [progress, setProgress] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setTags(await getTags());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (signedIn) void refresh();
  }, [signedIn]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const valid = await validateRangerAdmin(credentials);
      if (!valid) {
        setMessage("Incorrect wall credentials.");
        return;
      }
      setSignedIn(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify wall credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(tag: TagRecord) {
    if (!window.confirm(`Delete the message from ${tag.name}? This can't be undone.`)) return;
    setWorking(tag.id);
    setMessage("");
    try {
      const deleted = await deleteTagWithCredentials(tag.id, credentials);
      if (!deleted) {
        setMessage("The post could not be found.");
        return;
      }
      setTags((current) => current.filter((item) => item.id !== tag.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete post.");
    } finally {
      setWorking(null);
    }
  }

  function toggleSelected(id: string) {
    if (bulkWorking) return;
    setSelected((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  async function deleteSelection() {
    const ids = tags.filter((tag) => selected.includes(tag.id)).map((tag) => tag.id);
    if (!ids.length || bulkWorking) return;
    if (!window.confirm(`Delete ${ids.length} selected posts permanently? This cannot be undone.`)) return;
    setBulkWorking(true);
    setMessage("");
    let completed = 0;
    let failed = 0;
    for (const id of ids) {
      setProgress(`Processing ${completed + failed + 1} / ${ids.length}`);
      try {
        const removed = await deleteTagWithCredentials(id, credentials);
        if (removed) {
          completed++;
          setTags((previous) => previous.filter((tag) => tag.id !== id));
          setSelected((previous) => previous.filter((value) => value !== id));
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    setProgress("");
    setBulkWorking(false);
    setMessage(failed ? `Removed ${completed}. ${failed} could not be removed and remain selected.` : `Removed ${completed} posts.`);
  }

  if (!signedIn) {
    return <main className="admin-shell"><form className="admin-login" onSubmit={(event) => void signIn(event)}>
      <ShieldCheck size={34} />
      <h1>Penny's Wall — Admin</h1>
      <p>Use the wall moderation credentials. No email redirect needed.</p>
      <input type="text" autoComplete="username" aria-label="Admin username" placeholder="Username"
        value={credentials.username} onChange={(e) => setCredentials((current) => ({ ...current, username: e.target.value }))} required />
      <input type="password" autoComplete="current-password" aria-label="Admin password" placeholder="Password"
        value={credentials.password} onChange={(e) => setCredentials((current) => ({ ...current, password: e.target.value }))} required />
      <button type="submit" disabled={loading}><ShieldCheck size={16}/>{loading ? "Checking…" : "Open moderation"}</button>
      {message && <div className="admin-message" role="alert">{message}</div>}
      <p><a href="/" style={{color:"#efb7d6"}}>← Back to birthday wall</a></p>
    </form></main>;
  }

  return <main className="admin-shell">
    <div className="admin-toolbar"><div><span>PENNY'S BIRTHDAY WALL</span><h1>Manage Wall Tags</h1></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <a href="/" className="admin-secondary"><ArrowLeft size={15}/> Wall</a>
        <button type="button" className="admin-secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15}/> Refresh</button>
        <button type="button" className="admin-secondary" onClick={() => { setSignedIn(false); setCredentials({username:"",password:""});setTags([]); }}><LogOut size={15}/> Lock</button>
      </div>
    </div>
    {message && <div className="admin-message" role="status">{message}</div>}
    <p style={{color:"#c4bec2",fontSize:13}}>{loading ? "Loading posts…" : `${tags.length} post${tags.length === 1 ? "" : "s"} on the wall. Delete the old Ranger posts individually to give Penny a fresh start.`}</p>
    <div className="admin-list">{[...tags].reverse().map((tag) => <article className="admin-item" key={tag.id}>
      {tag.media_url && <img src={tag.media_url} alt="" className="admin-item__image"/>}
      <div className="admin-item__body"><strong>{tag.name}</strong><p>{tag.message}</p><small>{new Date(tag.created_at).toLocaleString()}</small></div>
      <button type="button" className="admin-delete" disabled={working===tag.id} onClick={() => void remove(tag)} aria-label={`Delete post by ${tag.name}`}><Trash2 size={16}/></button>
    </article>)}</div>
  </main>;
}
