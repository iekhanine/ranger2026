import { supabase } from "./supabase";
import type { TagRecord } from "./types";

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

export async function getTags(): Promise<TagRecord[]> {
  const { data, error } = await supabase
    .from("ranger2026_tags")
    .select("id, name, message, media_url, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TagRecord[];
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

  if (error) throw error;
  return data as TagRecord;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase
    .from("ranger2026_tags")
    .delete()
    .eq("id", id);

  if (error) throw error;
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

  if (error) throw error;

  const { data } = supabase.storage
    .from("ranger2026-media")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
