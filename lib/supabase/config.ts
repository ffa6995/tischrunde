/**
 * Ist Supabase mit echten Projektwerten konfiguriert?
 * Solange Platzhalter in .env.local stehen, läuft die App im Demo-Modus
 * (Reads aus Fixtures, Joins optimistisch im Cache). Sobald echte Keys
 * gesetzt sind, schalten alle Hooks automatisch auf die DB um.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes("placeholder") || key.includes("placeholder")) return false;
  return true;
}
