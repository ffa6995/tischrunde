import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotepadSheet, NotepadSheetStatus, NotepadTemplate } from "@/lib/types";

export interface CreateSheetInput {
  searchId: string | null;
  templateId: string | null;
  definition: Record<string, unknown>;
  players: Array<{ id: string; label: string; participant_id?: string | null }>;
  title: string | null;
}

export interface SaveEntriesInput {
  sheetId: string;
  entries: Record<string, unknown>;
  expectedRevision: number;
}

export interface SaveTemplateInput {
  templateId: string | null;
  name: string;
  description: string | null;
  gameId: string | null;
  definition: Record<string, unknown>;
  originTemplateId: string | null;
}

export async function getSheet(
  supabase: SupabaseClient,
  id: string,
): Promise<NotepadSheet | null> {
  const { data, error } = await supabase
    .from("notepad_sheets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as NotepadSheet | null) ?? null;
}

export async function getSheetsForRound(
  supabase: SupabaseClient,
  searchId: string,
): Promise<NotepadSheet[]> {
  const { data, error } = await supabase
    .from("notepad_sheets")
    .select("*")
    .eq("search_id", searchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NotepadSheet[];
}

/** RLS liefert genau System-Vorlagen plus eigene. */
export async function listTemplates(supabase: SupabaseClient): Promise<NotepadTemplate[]> {
  const { data, error } = await supabase
    .from("notepad_templates")
    .select("*")
    .order("kind", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NotepadTemplate[];
}

export async function createSheet(
  supabase: SupabaseClient,
  input: CreateSheetInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_notepad_sheet", {
    p_search_id: input.searchId,
    p_template_id: input.templateId,
    p_definition: input.definition,
    p_players: input.players,
    p_title: input.title,
  });
  if (error) throw error;
  return data as string;
}

export async function saveEntries(
  supabase: SupabaseClient,
  input: SaveEntriesInput,
): Promise<number> {
  const { data, error } = await supabase.rpc("save_notepad_entries", {
    p_sheet_id: input.sheetId,
    p_entries: input.entries,
    p_expected_revision: input.expectedRevision,
  });
  if (error) throw error;
  return data as number;
}

export async function setSheetStatus(
  supabase: SupabaseClient,
  sheetId: string,
  status: NotepadSheetStatus,
): Promise<void> {
  const { error } = await supabase.rpc("set_notepad_sheet_status", {
    p_sheet_id: sheetId,
    p_status: status,
  });
  if (error) throw error;
}

export async function transferWriter(
  supabase: SupabaseClient,
  sheetId: string,
  toUserId: string,
): Promise<void> {
  const { error } = await supabase.rpc("transfer_notepad_writer", {
    p_sheet_id: sheetId,
    p_to_user_id: toUserId,
  });
  if (error) throw error;
}

export async function saveTemplate(
  supabase: SupabaseClient,
  input: SaveTemplateInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("save_notepad_template", {
    p_template_id: input.templateId,
    p_name: input.name,
    p_description: input.description,
    p_game_id: input.gameId,
    p_definition: input.definition,
    p_origin_template_id: input.originTemplateId,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<void> {
  const { error } = await supabase.rpc("delete_notepad_template", {
    p_template_id: templateId,
  });
  if (error) throw error;
}
