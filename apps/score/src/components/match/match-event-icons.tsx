export function GoalBallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="10" cy="10" r="8.5" fill="white" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M10 3.5 12 7.5 10 11 8 7.5 10 3.5Z"
        fill="currentColor"
        opacity="0.85"
      />
      <path
        d="M10 3.5V2M12 7.5l1.8-1M8 7.5l-1.8-1M10 11v2M8 7.5 6 9M12 7.5l2 1.5M10 11l-2 1.5M10 11l2 1.5"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PenaltyGoalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <rect x="3" y="3" width="14" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 13h14" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="8" r="3" fill="white" stroke="currentColor" strokeWidth="1" />
      <path d="M10 6v4M8.5 7.5h3" stroke="currentColor" strokeWidth="0.7" />
    </svg>
  );
}

export function SubstitutionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        d="M4 7h8M10 7l-2.5-2.5M10 7l-2.5 2.5"
        stroke="#dc2626"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 13H8M8 13l2.5-2.5M8 13l2.5 2.5"
        stroke="#16a34a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function YellowCardIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-2.5 rounded-[2px] bg-yellow-400 ${className ?? ""}`}
      aria-hidden
    />
  );
}

export function RedCardIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-2.5 rounded-[2px] bg-red-600 ${className ?? ""}`}
      aria-hidden
    />
  );
}
