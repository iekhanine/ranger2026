export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const pieces = [record.message, record.details, record.hint]
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => value.trim());

    const code = typeof record.code === "string" && record.code.trim()
      ? ` (${record.code.trim()})`
      : "";

    if (pieces.length) {
      return `${pieces.join(" — ")}${code}`;
    }
  }

  return fallback;
}
