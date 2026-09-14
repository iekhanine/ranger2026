import { Grip, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import TagComposer from "./TagComposer";
import type { TagRecord } from "../lib/types";

type Props = {
  onCreated: (tag: TagRecord) => void;
};

type Position = {
  x: number;
  y: number;
};

const PANEL_WIDTH = 470;
const EDGE = 14;

function initialPosition(collapsed: boolean): Position {
  if (typeof window === "undefined") return { x: 24, y: 22 };

  const width = collapsed ? 220 : PANEL_WIDTH;

  return {
    x: Math.max(EDGE, window.innerWidth - width - 24),
    y: 22,
  };
}

export default function FloatingComposer({ onCreated }: Props) {
  const startsCollapsed = typeof window !== "undefined" && window.innerWidth <= 700;
  const [collapsed, setCollapsed] = useState(startsCollapsed);
  const [position, setPosition] = useState<Position>(() => initialPosition(startsCollapsed));
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panelX: number;
    panelY: number;
  } | null>(null);

  useEffect(() => {
    function clampPosition() {
      setPosition((current) => ({
        x: Math.min(
          Math.max(EDGE, current.x),
          Math.max(EDGE, window.innerWidth - (collapsed ? 220 : PANEL_WIDTH) - EDGE),
        ),
        y: Math.min(
          Math.max(EDGE, current.y),
          Math.max(EDGE, window.innerHeight - (collapsed ? 46 : 360) - EDGE),
        ),
      }));
    }

    window.addEventListener("resize", clampPosition);
    return () => window.removeEventListener("resize", clampPosition);
  }, [collapsed]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panelX: position.x,
      panelY: position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const width = collapsed ? 220 : PANEL_WIDTH;
    const nextX = drag.panelX + (event.clientX - drag.startX);
    const nextY = drag.panelY + (event.clientY - drag.startY);

    setPosition({
      x: Math.min(
        Math.max(EDGE, nextX),
        Math.max(EDGE, window.innerWidth - width - EDGE),
      ),
      y: Math.min(
        Math.max(EDGE, nextY),
        Math.max(EDGE, window.innerHeight - 46),
      ),
    });
  }

  function stopDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  return (
    <div
      className={`floating-composer${collapsed ? " floating-composer--collapsed" : ""}`}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
    >
      <div
        className="floating-composer__dragbar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <div>
          <Grip size={14} />
          <span>LEAVE YOUR MARK</span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Open tag form" : "Minimize tag form"}
        >
          {collapsed ? <Plus size={14} /> : <Minus size={14} />}
        </button>
      </div>

      {!collapsed && <TagComposer onCreated={onCreated} />}
    </div>
  );
}
