"use client";

import { useRouter } from "next/navigation";

export function FixtureCompetitionSwitcher({
  currentId,
  competitions,
}: {
  currentId: string;
  competitions: Array<{ id: string; name: string; season: string }>;
}) {
  const router = useRouter();
  return (
    <label className="block text-sm">
      <span className="sr-only">Switch competition</span>
      <select
        value={currentId}
        onChange={(e) => router.push(`/admin/fixtures/${e.target.value}`)}
        className="rounded-lg border border-rule px-3 py-2 text-sm font-semibold"
      >
        {competitions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {c.season}
          </option>
        ))}
      </select>
    </label>
  );
}
