import type { CSSProperties, KeyboardEvent } from "react";
import type { TagRecord } from "../lib/types";
import type { TagPlacement } from "../lib/wallLayout";

type Props = {
  tag: TagRecord;
  index: number;
  placement?: TagPlacement;
  densityScale?: number;
  mode?: "wall" | "focus";
  onOpen?: (tag: TagRecord) => void;
};

const variants = [
  "wildstyle",
  "handstyle",
  "bubble",
  "stencil",
  "marker",
  "throwup",
  "chalk",
];

export default function TagCard({
  tag,
  index,
  placement,
  densityScale = 1,
  mode = "wall",
  onOpen,
}: Props) {
  const variant = variants[index % variants.length];

  const style = mode === "wall" && placement
    ? ({
        left: `${placement.x}px`,
        top: `${placement.y}px`,
        width: `${placement.width}px`,
        minHeight: `${placement.height}px`,
        "--tag-rotation": `${placement.rotation}deg`,
        "--tag-density": `${densityScale}`,
        "--tag-z": `${placement.zIndex}`,
      } as CSSProperties)
    : undefined;

  function open() {
    if (mode === "wall") onOpen?.(tag);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  }

  return (
    <article
      className={`wall-tag wall-tag--${variant} wall-tag--${mode}`}
      data-wall-tag-id={mode === "wall" ? tag.id : undefined}
      style={style}
      onClick={open}
      onKeyDown={onKeyDown}
      role={mode === "wall" ? "button" : undefined}
      tabIndex={mode === "wall" ? 0 : undefined}
      aria-label={mode === "wall" ? `Open tag from ${tag.name}` : undefined}
    >
      <div className="wall-tag__paint">
        <div className="wall-tag__message">{tag.message}</div>
        <div className="wall-tag__signature">— {tag.name}</div>

        {tag.media_url && (
          <div className="wall-tag__photo">
            <img src={tag.media_url} alt={`Birthday post from ${tag.name}`} />
          </div>
        )}
      </div>
    </article>
  );
}
