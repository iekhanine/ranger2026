const MOBILE_PHOTO_MAX_EDGE = 1800;
const JPEG_QUALITY = 0.82;
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected photo could not be decoded."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The selected photo could not be prepared for upload."));
      },
      type,
      quality,
    );
  });
}

/**
 * Phone-camera JPEGs can easily be 5–12 MB even when the visible photo is small.
 * Shrink ordinary still photos before sending them to Supabase. GIFs are left
 * untouched so animation is preserved.
 */
export async function prepareMediaForUpload(file: File): Promise<File> {
  if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
    return file;
  }

  const isJpeg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
  const needsCompression = file.size > COMPRESSION_THRESHOLD;

  if (!isJpeg && !needsCompression) return file;

  try {
    const image = await loadImage(file);
    const largestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const ratio = largestEdge > MOBILE_PHOTO_MAX_EDGE
      ? MOBILE_PHOTO_MAX_EDGE / largestEdge
      : 1;

    // Small JPEGs do not need to be re-encoded unless their dimensions are huge.
    if (ratio === 1 && !needsCompression) return file;

    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "ranger-photo";

    // Never replace an original with a larger recompressed version.
    if (blob.size >= file.size) return file;

    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // Compression is an optimization, not a requirement. If a browser cannot
    // decode/re-encode the file, let Supabase try the original.
    return file;
  }
}
