import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";

export function SportComingSoon({ sport }: { sport: SportId }) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-lg rounded-xl border border-rule bg-white px-6 py-12 text-center">
        <p className="font-display text-2xl font-extrabold tracking-tight">Coming soon</p>
        <p className="mt-3 text-sm text-accent/70">
          {SPORT_LABELS[sport]} isn’t live on AU Score yet — no competitions or clubs have been
          onboarded. Switch back to Football for fixtures, tables, and stats.
        </p>
      </div>
    </div>
  );
}
