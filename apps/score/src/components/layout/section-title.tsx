export function LiveBadge() {
  return (
    <span className="font-display text-[11px] font-extrabold uppercase tracking-wider text-accent">
      Live
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl font-extrabold tracking-tight text-accent sm:text-2xl">
      {children}
    </h2>
  );
}
