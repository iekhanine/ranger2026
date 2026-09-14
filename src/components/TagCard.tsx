import { useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { TagRecord } from "../lib/types";
import type { TagPlacement } from "../lib/wallLayout";

type Props = {
  tag: TagRecord;
  index: number;
  placement?: TagPlacement;
  densityScale?: number;
  dragScale?: number;
  mode?: "wall" | "focus";
  onOpen?: (tag: TagRecord) => void;
  onMove?: (tagId: string, next: { x: number; y: number }) => void;
  onMoveEnd?: (tagId: string, next: { x: number; y: number }) => void;
  onBringToFront?: (tagId: string) => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
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

const DRAG_THRESHOLD = 6;

function getTagTextScale(message: string) {
  const trimmed = message.trim();
  const lines = trimmed ? trimmed.split(/\r?\n/) : [""];
  const effectiveLength = trimmed.length + Math.max(0, lines.length - 1) * 45;

  if (effectiveLength <= 70) return 1;
  if (effectiveLength <= 140) return 0.96;
  if (effectiveLength <= 240) return 0.88;
  if (effectiveLength <= 380) return 0.78;
  if (effectiveLength <= 560) return 0.68;
  if (effectiveLength <= 800) return 0.58;
  if (effectiveLength <= 1100) return 0.49;
  if (effectiveLength <= 1500) return 0.41;
  if (effectiveLength <= 2100) return 0.34;
  if (effectiveLength <= 3000) return 0.29;
  return 0.25;
}

function getMinimumTextScale(message: string, hasMedia: boolean) {
  const length = message.trim().length;

  if (length <= 140) return hasMedia ? 0.78 : 0.72;
  if (length <= 380) return hasMedia ? 0.64 : 0.58;
  if (length <= 800) return 0.46;
  if (length <= 1500) return 0.34;
  return 0.24;
}

export default function TagCard({
  tag,
  index,
  placement,
  densityScale = 1,
  dragScale = 1,
  mode = "wall",
  onOpen,
  onMove,
  onMoveEnd,
  onBringToFront,
}: Props) {
  const variant = variants[index % variants.length];
  const dragRef = useRef<DragState | null>(null);
  const suppressOpenRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const textScale = getTagTextScale(tag.message);

  const style = mode === "wall" && placement
    ? ({
        left: `${placement.x}px`,
        top: `${placement.y}px`,
        width: `${placement.width}px`,
        "--tag-rotation": `${placement.rotation}deg`,
        "--tag-density": `${densityScale}`,
        "--tag-z": `${placement.zIndex}`,
        "--tag-text-scale": `${textScale}`,
      } as CSSProperties)
    : ({ "--tag-text-scale": `${textScale}` } as CSSProperties);


  function open() {
    if (mode === "wall") onOpen?.(tag);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (
      mode !== "wall" ||
      !placement ||
      !onMove ||
      event.button !== 0
    ) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: placement.x,
      originY: placement.y,
      moved: false,
    };

    suppressOpenRef.current = false;
    setDragging(true);
    onBringToFront?.(tag.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const safeDragScale = dragScale > 0 ? dragScale : 1;
    const screenDx = event.clientX - drag.startX;
    const screenDy = event.clientY - drag.startY;
    const dx = screenDx / safeDragScale;
    const dy = screenDy / safeDragScale;

    if (!drag.moved && Math.hypot(screenDx, screenDy) >= DRAG_THRESHOLD) {
      drag.moved = true;
      suppressOpenRef.current = true;
    }

    onMove?.(tag.id, {
      x: drag.originX + dx,
      y: drag.originY + dy,
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const safeDragScale = dragScale > 0 ? dragScale : 1;
    const dx = (event.clientX - drag.startX) / safeDragScale;
    const dy = (event.clientY - drag.startY) / safeDragScale;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (drag.moved) {
      suppressOpenRef.current = true;
      onMoveEnd?.(tag.id, {
        x: drag.originX + dx,
        y: drag.originY + dy,
      });
    }

    dragRef.current = null;
    setDragging(false);
  }

  function onClick(event: React.MouseEvent<HTMLElement>) {
    if (suppressOpenRef.current) {
      suppressOpenRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    open();
  }

  return (
    <article
      className={`wall-tag wall-tag--${variant} wall-tag--${mode}${dragging ? " wall-tag--dragging" : ""}`}
      data-wall-tag-id={mode === "wall" ? tag.id : undefined}
      style={style}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
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
