// « de » devant un nom propre : élision devant une voyelle ou un h muet
// (« la fiche d’Armand Mballa », « la fiche de Roland Nana »). Les messages
// anglais ignorent simplement cette valeur.
export function de(name: string | null | undefined) {
  return name && /^[aeiouyhàâäéèêëîïôöùûüÿœæ]/i.test(name.trim()) ? "d’" : "de ";
}
