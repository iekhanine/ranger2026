import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const WALL_WIDTH = 1920;
const WALL_HEIGHT = 1080;

const PDF_SCALE = 3;
const PDF_PADDING = 48;

const VIDEO_SCALE = 2;
const VIDEO_WIDTH = WALL_WIDTH * VIDEO_SCALE;
const VIDEO_HEIGHT = WALL_HEIGHT * VIDEO_SCALE;
const VIDEO_FPS = 30;
const VIDEO_WINDOW_MS = 72 * 60 * 60 * 1000;

export type VideoExportTag = {
  id: string;
  createdAt: string;
};

type CapturedTagLayer = {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAtMs: number;
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function captureWall(element: HTMLElement, scale: number) {
  await document.fonts.ready;

  return html2canvas(element, {
    backgroundColor: null,
    scale,
    useCORS: true,
    allowTaint: false,
    logging: false,
    width: WALL_WIDTH,
    height: WALL_HEIGHT,
    windowWidth: WALL_WIDTH,
    windowHeight: WALL_HEIGHT,
    imageTimeout: 15000,
  });
}

function getWallDisplayScale(element: HTMLElement) {
  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error("The wall is not currently measurable.");
  }

  return {
    surfaceRect: rect,
    scaleX: rect.width / WALL_WIDTH,
    scaleY: rect.height / WALL_HEIGHT,
  };
}

function getRenderedTagBounds(element: HTMLElement): Bounds {
  const tagElements = Array.from(
    element.querySelectorAll<HTMLElement>("[data-wall-tag-id]"),
  );

  if (tagElements.length === 0) {
    throw new Error("There are no tags on the wall to export yet.");
  }

  const { surfaceRect, scaleX, scaleY } = getWallDisplayScale(element);

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const tagElement of tagElements) {
    const rect = tagElement.getBoundingClientRect();

    const left = (rect.left - surfaceRect.left) / scaleX;
    const top = (rect.top - surfaceRect.top) / scaleY;
    const right = (rect.right - surfaceRect.left) / scaleX;
    const bottom = (rect.bottom - surfaceRect.top) / scaleY;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  }

  const x = Math.max(0, Math.floor(minX - PDF_PADDING));
  const y = Math.max(0, Math.floor(minY - PDF_PADDING));
  const right = Math.min(WALL_WIDTH, Math.ceil(maxX + PDF_PADDING));
  const bottom = Math.min(WALL_HEIGHT, Math.ceil(maxY + PDF_PADDING));

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

function setVisibility(
  elements: HTMLElement[],
  visibility: "hidden" | "visible",
) {
  const previous = elements.map((element) => element.style.visibility);

  elements.forEach((element) => {
    element.style.visibility = visibility;
  });

  return () => {
    elements.forEach((element, index) => {
      element.style.visibility = previous[index];
    });
  };
}

function cropCanvas(source: HTMLCanvasElement, bounds: Bounds) {
  const scaleX = source.width / WALL_WIDTH;
  const scaleY = source.height / WALL_HEIGHT;

  const sourceX = Math.max(0, Math.round(bounds.x * scaleX));
  const sourceY = Math.max(0, Math.round(bounds.y * scaleY));
  const sourceWidth = Math.min(
    source.width - sourceX,
    Math.max(1, Math.round(bounds.width * scaleX)),
  );
  const sourceHeight = Math.min(
    source.height - sourceY,
    Math.max(1, Math.round(bounds.height * scaleY)),
  );

  const output = document.createElement("canvas");
  output.width = sourceWidth;
  output.height = sourceHeight;

  const context = output.getContext("2d");
  if (!context) {
    throw new Error("Could not create the PDF crop canvas.");
  }

  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );

  return output;
}

export async function exportWallPdf(element: HTMLElement) {
  const bounds = getRenderedTagBounds(element);

  // The PDF is the tag wall itself — not the birthday plaque/status/footer.
  const chrome = Array.from(
    element.querySelectorAll<HTMLElement>(
      ".birthday-corner-tag, .wall-footer, .wall-status",
    ),
  );

  const restoreChrome = setVisibility(chrome, "hidden");

  try {
    const fullCanvas = await captureWall(element, PDF_SCALE);
    const canvas = cropCanvas(fullCanvas, bounds);

    const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";

    const pdf = new jsPDF({
      orientation,
      unit: "px",
      format: [canvas.width, canvas.height],
      hotfixes: ["px_scaling"],
      compress: true,
    });

    const image = canvas.toDataURL("image/png");

    pdf.addImage(
      image,
      "PNG",
      0,
      0,
      canvas.width,
      canvas.height,
      undefined,
      "FAST",
    );

    pdf.save("RANGER2026-tags-full-resolution.pdf");
  } finally {
    restoreChrome();
  }
}

function supportedVideoMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return (
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ""
  );
}

function easeOutBack(value: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

async function captureRecentTagLayers(
  element: HTMLElement,
  recentTags: VideoExportTag[],
) {
  const tagElements = Array.from(
    element.querySelectorAll<HTMLElement>("[data-wall-tag-id]"),
  );

  const byId = new Map<string, HTMLElement>();

  tagElements.forEach((tagElement) => {
    const id = tagElement.dataset.wallTagId;
    if (id) byId.set(id, tagElement);
  });

  const { surfaceRect, scaleX, scaleY } = getWallDisplayScale(element);
  const recentElements = recentTags
    .map((tag) => byId.get(tag.id))
    .filter((tagElement): tagElement is HTMLElement => Boolean(tagElement));

  const restoreRecentVisibility = setVisibility(recentElements, "hidden");

  try {
    // Everything older than 72 hours remains visible in this base image.
    const baseline = await captureWall(element, VIDEO_SCALE);
    const layers: CapturedTagLayer[] = [];

    for (const tag of recentTags) {
      const tagElement = byId.get(tag.id);
      if (!tagElement) continue;

      tagElement.style.visibility = "visible";

      const rect = tagElement.getBoundingClientRect();

      const x = (rect.left - surfaceRect.left) / scaleX;
      const y = (rect.top - surfaceRect.top) / scaleY;
      const width = rect.width / scaleX;
      const height = rect.height / scaleY;

      const elementCaptureScale = VIDEO_SCALE / Math.max(scaleX, 0.01);

      const canvas = await html2canvas(tagElement, {
        backgroundColor: null,
        scale: elementCaptureScale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000,
      });

      layers.push({
        canvas,
        x,
        y,
        width,
        height,
        createdAtMs: new Date(tag.createdAt).getTime(),
      });

      tagElement.style.visibility = "hidden";
    }

    return { baseline, layers };
  } finally {
    restoreRecentVisibility();
  }
}

export async function exportWallVideo(
  element: HTMLElement,
  tags: VideoExportTag[],
) {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser does not support video export.");
  }

  await document.fonts.ready;

  const now = Date.now();
  const cutoff = now - VIDEO_WINDOW_MS;

  const recentTags = tags
    .map((tag) => ({
      ...tag,
      createdAtMs: new Date(tag.createdAt).getTime(),
    }))
    .filter(
      (tag) =>
        Number.isFinite(tag.createdAtMs) &&
        tag.createdAtMs >= cutoff &&
        tag.createdAtMs <= now,
    )
    .sort((a, b) => a.createdAtMs - b.createdAtMs)
    .map(({ id, createdAt }) => ({ id, createdAt }));

  const { baseline, layers } = await captureRecentTagLayers(
    element,
    recentTags,
  );

  const output = document.createElement("canvas");
  output.width = VIDEO_WIDTH;
  output.height = VIDEO_HEIGHT;

  const maybeContext = output.getContext("2d");
  if (!maybeContext) {
    throw new Error("Could not create the video canvas.");
  }

  // Copy the narrowed value into a non-null constant before it is used by
  // the nested animation callback. TypeScript otherwise widens the captured
  // getContext() result back to CanvasRenderingContext2D | null.
  const context: CanvasRenderingContext2D = maybeContext;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const stream = output.captureStream(VIDEO_FPS);
  const mimeType = supportedVideoMimeType();

  const recorder = new MediaRecorder(stream, {
    mimeType: mimeType || undefined,
    videoBitsPerSecond: 24_000_000,
  });

  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const finished = new Promise<void>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Video export failed."));
    recorder.onstop = () => resolve();
  });

  const durationMs =
    layers.length === 0
      ? 5000
      : Math.min(18000, Math.max(9000, 7000 + layers.length * 260));

  const introMs = layers.length > 0 ? 800 : 0;
  const outroMs = layers.length > 0 ? 1300 : durationMs;
  const revealSpanMs = Math.max(1, durationMs - introMs - outroMs);

  const validTimes = layers
    .map((layer) => layer.createdAtMs)
    .filter((time) => Number.isFinite(time));

  const firstTime =
    validTimes.length > 0 ? Math.min(...validTimes) : cutoff;
  const lastTime =
    validTimes.length > 0 ? Math.max(...validTimes) : now;

  const revealTimes = layers.map((layer, index) => {
    if (layers.length === 1 || lastTime <= firstTime) {
      return introMs + revealSpanMs * 0.5;
    }

    const relative = (layer.createdAtMs - firstTime) / (lastTime - firstTime);

    return introMs + Math.min(1, Math.max(0, relative)) * revealSpanMs;
  });

  recorder.start(500);

  const startedAt = performance.now();

  await new Promise<void>((resolve) => {
    function frame(nowFrame: number) {
      const elapsed = nowFrame - startedAt;

      context.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
      context.drawImage(
        baseline,
        0,
        0,
        baseline.width,
        baseline.height,
        0,
        0,
        VIDEO_WIDTH,
        VIDEO_HEIGHT,
      );

      layers.forEach((layer, index) => {
        const revealAt = revealTimes[index];
        const revealProgress = Math.min(
          1,
          Math.max(0, (elapsed - revealAt) / 420),
        );

        if (revealProgress <= 0) return;

        const eased = easeOutBack(revealProgress);
        const popScale = 0.82 + 0.18 * eased;

        const targetX = layer.x * VIDEO_SCALE;
        const targetY = layer.y * VIDEO_SCALE;
        const targetWidth = layer.width * VIDEO_SCALE;
        const targetHeight = layer.height * VIDEO_SCALE;

        const drawWidth = targetWidth * popScale;
        const drawHeight = targetHeight * popScale;
        const drawX = targetX + (targetWidth - drawWidth) / 2;
        const drawY = targetY + (targetHeight - drawHeight) / 2;

        context.save();
        context.globalAlpha = Math.min(1, revealProgress * 1.35);

        context.drawImage(
          layer.canvas,
          drawX,
          drawY,
          drawWidth,
          drawHeight,
        );

        context.restore();
      });

      if (elapsed < durationMs) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });

  recorder.stop();
  await finished;

  const blob = new Blob(chunks, {
    type: mimeType || "video/webm",
  });

  downloadBlob(blob, "RANGER2026-last-72-hours-4K.webm");
}
