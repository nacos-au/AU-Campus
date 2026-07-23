import type { WinProbability } from "@/lib/types/database";

export function WinProbabilityBars({
  data,
  showDraw = true,
}: {
  data: WinProbability;
  showDraw?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Bar label="Algorithm" home={data.algo.home} draw={showDraw ? data.algo.draw : 0} away={data.algo.away} showDraw={showDraw} />
      <Bar label="Fan Votes" home={data.votes.home} draw={showDraw ? data.votes.draw : 0} away={data.votes.away} showDraw={showDraw} />
    </div>
  );
}

function Bar({
  label,
  home,
  draw,
  away,
  showDraw,
}: {
  label: string;
  home: number;
  draw: number;
  away: number;
  showDraw: boolean;
}) {
  return (
    <div>
      <p className="mb-1 font-display text-xs font-bold uppercase opacity-60">{label}</p>
      <div className="flex h-2">
        <div className="bg-accent" style={{ width: `${home}%` }} />
        {showDraw && <div className="bg-accent/25" style={{ width: `${draw}%` }} />}
        <div className="bg-accent/60" style={{ width: `${away}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs">
        <span>Home {home}%</span>
        {showDraw && <span>Draw {draw}%</span>}
        <span>Away {away}%</span>
      </div>
    </div>
  );
}
