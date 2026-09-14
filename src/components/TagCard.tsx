import type { CSSProperties } from "react";
import type { TagRecord } from "../lib/types";

type Props = {
  tag: TagRecord;
  index: number;
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

const offsets = [
  [-16, 10],
  [12, -12],
  [-8, 16],
  [18, 4],
  [-20, -7],
  [8, 13],
  [-11, -15],
  [17, -3],
];

export default function TagCard({ tag, index }: Props) {
  const rotation = ((index * 17) % 11) - 5;
  const variant = variants[index % variants.length];
  const [offsetX, offsetY] = offsets[index % offsets.length];

  const style = {
    "--tag-rotation": `${rotation}deg`,
    "--tag-x": `${offsetX}px`,
    "--tag-y": `${offsetY}px`,
    "--tag-z": `${10 + (index % 9)}`,
  } as CSSProperties;

  return (
    <article className={`wall-tag wall-tag--${variant}`} style={style}>
      {tag.media_url && (
        <div className="wall-tag__photo">
          <img src={tag.media_url} alt={`Birthday post from ${tag.name}`} />
        </div>
      )}

      <div className="wall-tag__paint">
        <div className="wall-tag__message">{tag.message}</div>
        <div className="wall-tag__signature">{tag.name}</div>
      </div>
    </article>
  );
}
