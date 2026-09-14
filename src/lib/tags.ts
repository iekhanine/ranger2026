import { supabase } from "./supabase";
import type { TagRecord } from "./types";
import { getErrorMessage } from "./errors";

export type RangerAdminCredentials = {
  username: string;
  password: string;
};

function credentialsMatch(credentials: RangerAdminCredentials) {
  return (
    credentials.username.trim().toLowerCase() === "ranger" &&
    credentials.password === "ranger2026"
  );
}

function isMissingRpcError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("could not find the function") ||
    message.includes("function public.ranger2026_") ||
    message.includes("schema cache") ||
    message.includes("404")
  );
}

function isMissingLayoutSchemaError(error: unknown) {
  const message = getErrorMessage(error, "").toLowerCase();
  return (
    message.includes("layout_x") ||
    message.includes("layout_y") ||
    message.includes("layout_z") ||
    message.includes("schema cache")
  );
}

export async function validateRangerAdmin(
  credentials: RangerAdminCredentials,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("ranger2026_validate_admin", {
      p_username: credentials.username.trim(),
      p_password: credentials.password,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    if (credentialsMatch(credentials) && isMissingRpcError(error)) {
      return true;
    }

    if (credentialsMatch(credentials) && error instanceof Error) {
      return true;
    }

    if (error instanceof Error) throw error;
    throw new Error("Could not verify the admin credentials.");
  }
}

export async function deleteTagWithCredentials(
  id: string,
  credentials: RangerAdminCredentials,
): Promise<boolean> {
  if (!credentialsMatch(credentials)) {
    throw new Error("Invalid Ranger admin credentials.");
  }

  try {
    const { data, error } = await supabase.rpc(
      "ranger2026_delete_tag_with_credentials",
      {
        p_id: id,
        p_username: credentials.username.trim(),
        p_password: credentials.password,
      },
    );

    if (error) throw error;
    return data === true;
  } catch (rpcError) {
    try {
      const { error } = await supabase
        .from("ranger2026_tags")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (deleteError) {
      if (isMissingRpcError(rpcError)) {
        throw new Error(
          "Hidden admin delete is not enabled in Supabase yet. Run sql/002_hidden_admin_credentials.sql, then try again.",
        );
      }

      if (deleteError instanceof Error) throw deleteError;
      if (rpcError instanceof Error) throw rpcError;
      throw new Error("Could not delete that post.");
    }
  }
}

export async function saveTagPlacement(input: {
  id: string;
  x: number;
  y: number;
  zIndex: number;
}): Promise<{ layout_x: number; layout_y: number; layout_z: number }> {
  const { data, error } = await supabase.rpc("ranger2026_move_tag", {
    p_id: input.id,
    p_x: input.x,
    p_y: input.y,
    p_z: input.zIndex,
  });

  if (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Could not save this tag position. Run sql/004_shared_tag_positions.sql in Supabase.",
      ),
    );
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error("Could not save this tag position.");
  }

  return {
    layout_x: Number(row.layout_x),
    layout_y: Number(row.layout_y),
    layout_z: Number(row.layout_z),
  };
}

export async function getTags(): Promise<TagRecord[]> {
  const withLayout = await supabase
    .from("ranger2026_tags")
    .select("id, name, message, media_url, created_at, layout_x, layout_y, layout_z")
    .order("created_at", { ascending: true });

  if (!withLayout.error) {
    return (withLayout.data ?? []) as TagRecord[];
  }

  // Let the app continue to work while the shared-layout migration is being
  // deployed. Drag saving will still clearly ask for migration 004.
  if (!isMissingLayoutSchemaError(withLayout.error)) {
    throw new Error(getErrorMessage(withLayout.error, "Could not load the wall."));
  }

  const legacy = await supabase
    .from("ranger2026_tags")
    .select("id, name, message, media_url, created_at")
    .order("created_at", { ascending: true });

  if (legacy.error) {
    throw new Error(getErrorMessage(legacy.error, "Could not load the wall."));
  }

  return (legacy.data ?? []).map((tag) => ({
    ...tag,
    layout_x: null,
    layout_y: null,
    layout_z: null,
  })) as TagRecord[];
}

export async function createTag(input: {
  name: string;
  message: string;
  mediaUrl?: string | null;
}): Promise<TagRecord> {
  const { data, error } = await supabase
    .from("ranger2026_tags")
    .insert({
      name: input.name.trim(),
      message: input.message.trim(),
      media_url: input.mediaUrl ?? null,
    })
    .select("id, name, message, media_url, created_at")
    .single();

  if (error) throw new Error(getErrorMessage(error, "Could not save the birthday post."));
  return {
    ...(data as Omit<TagRecord, "layout_x" | "layout_y" | "layout_z">),
    layout_x: null,
    layout_y: null,
    layout_z: null,
  };
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase
    .from("ranger2026_tags")
    .delete()
    .eq("id", id);

  if (error) throw new Error(getErrorMessage(error, "Could not delete that post."));
}

export async function uploadMedia(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("ranger2026-media")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(getErrorMessage(error, "Could not upload the photo."));

  const { data } = supabase.storage
    .from("ranger2026-media")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
