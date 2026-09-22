// Lecture centralisée des variables Supabase.
// Renvoie null tant que .env.local n'est pas renseigné, pour que le site
// démarre même sans projet Supabase (utile pour travailler sur l'interface).
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes("votre-projet")) return null;
  return { url, key };
}
