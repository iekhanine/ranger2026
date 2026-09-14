import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { createTag, uploadMedia } from "../lib/tags";
import { getErrorMessage } from "../lib/errors";
import { prepareMediaForUpload } from "../lib/media";
import type { TagRecord } from "../lib/types";

type Props = {
  onCreated: (tag: TagRecord) => void;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const NAME_MAX = 40;
const MESSAGE_MAX = 500;

export default function TagComposer({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function chooseFile(nextFile: File | null) {
    setError("");

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    if (!nextFile) {
      setFile(null);
      setPreview(null);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setError("Use an image or GIF file.");
      return;
    }

    if (nextFile.size > MAX_FILE_BYTES) {
      setError("Keep photos and GIFs under 8 MB.");
      return;
    }

    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Add your name or handle.");
      return;
    }

    if (!message.trim()) {
      setError("Write Ranger something first.");
      return;
    }

    try {
      setSaving(true);

      let mediaUrl: string | null = null;

      if (file) {
        try {
          const preparedFile = await prepareMediaForUpload(file);
          mediaUrl = await uploadMedia(preparedFile);
        } catch (uploadError) {
          throw new Error(
            `Photo upload failed: ${getErrorMessage(uploadError, "Supabase rejected the image.")}`,
          );
        }
      }

      let created: TagRecord;

      try {
        created = await createTag({
          name,
          message,
          mediaUrl,
        });
      } catch (postError) {
        throw new Error(
          `Post save failed: ${getErrorMessage(postError, "Supabase rejected the post.")}`,
        );
      }

      onCreated(created);

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      setName("");
      setMessage("");
      setFile(null);
      setPreview(null);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Could not tag the wall."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="composer-shell" id="tag-the-wall">
      <form className="composer" onSubmit={submit}>
        <div className="composer__header">
          <div>
            <h2>Tag the wall</h2>
            <span className="composer__subhead">Write it like you mean it.</span>
          </div>

        </div>

        <div className="composer__fields">
          <label className="field">
            <div className="field__label-row">
              <span>Your name / handle</span>
              <small>{name.length}/{NAME_MAX}</small>
            </div>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={NAME_MAX}
              placeholder="Ivan"
              autoComplete="name"
            />
          </label>

          <label className="field">
            <div className="field__label-row">
              <span>Birthday message</span>
              <small>{message.length}/{MESSAGE_MAX}</small>
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MESSAGE_MAX}
              rows={5}
              placeholder="Happy birthday, you magnificent bastard."
            />
          </label>
        </div>

        {preview && (
          <div className="composer__preview">
            <img src={preview} alt="Selected upload preview" />

            <div className="composer__preview-copy">
              <strong>{file?.name}</strong>
              <span>Ready to paste onto the wall.</span>
            </div>

            <button
              type="button"
              className="preview-remove"
              onClick={() => chooseFile(null)}
              aria-label="Remove selected image"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {error && <div className="composer__error">{error}</div>}

        <div className="composer__actions">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.gif"
              hidden
              onChange={(event) =>
                chooseFile(event.target.files?.[0] ?? null)
              }
            />

            <button
              type="button"
              className="button button--secondary"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={16} />
              Add photo / GIF
            </button>
          </div>

          <button
            type="submit"
            className="button button--primary"
            disabled={saving}
          >
            <Send size={16} />
            {saving ? "TAGGING..." : "TAG THE WALL"}
          </button>
        </div>
      </form>
    </section>
  );
}
