export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display text-xl font-extrabold tracking-[0.08em] whitespace-nowrap ${className}`}
    >
      LSES <span className="text-gold-ink">FIGHTING</span>
    </span>
  );
}
