// Recréé à chaque changement de page (contrairement au layout) : la page
// arrive en fondu, sans script. Rien ne bouge si le système demande de
// réduire les animations (voir globals.css).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
