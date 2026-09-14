import { useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

type Position = {
  x: number;
  y: number;
};

type Props = {
  className: string;
  position: Position;
  scale: number;
  onMove: (next: Position) => void;
  children: ReactNode;
  style?: CSSProperties;
  title?: string;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

const INTERACTIVE_SELECTOR = "a, button, input, textarea, select, label";

export default function DraggableWallBox({
  className,
  position,
  scale,
  onMove,
  children,
  style,
  title,
}: Props) {
  const dragRef = useRef<DragState | null>(null);

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest(INTERACTIVE_SELECTOR) || event.button !== 0) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const safeScale = scale > 0 ? scale : 1;
    const dx = (event.clientX - drag.startX) / safeScale;
    const dy = (event.clientY - drag.startY) / safeScale;

    onMove({
      x: drag.originX + dx,
      y: drag.originY + dy,
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
  }

  return (
    <section
      className={className}
      style={{ ...style, left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      title={title}
    >
      {children}
    </section>
  );
}
