import { supabase } from "./supabase";
import type { TagRecord } from "./types";

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
