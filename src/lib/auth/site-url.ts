// Adresse publique du site, utilisée pour les liens envoyés par Supabase
// (redirection après Google, liens des e-mails). On la lit dans la
// configuration plutôt que dans les en-têtes de la requête, qui peuvent
// être falsifiés. Elle doit figurer dans les Redirect URLs de Supabase.
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}
