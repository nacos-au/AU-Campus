import Link from "next/link";
import {
  classifyNext,
  digestSignInUrl,
  pathFromNext,
  scoreSignInUrl,
  type AppDestination,
} from "@/lib/auth-destinations";

export function WelcomeChooser({
  email,
  next,
}: {
  email: string;
  next: string | null;
}) {
  const hinted = classifyNext(next);
  const digestHref = digestSignInUrl(email, pathFromNext(next, "digest"));
  const scoreHref = scoreSignInUrl(email, pathFromNext(next, "score"));

  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
        AU Campus · AU Digest · AU Score
      </p>
      <h1 className="mt-4 text-center font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        You’re in
      </h1>
      <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-ink-soft">
        Your account is ready. Same email and password work across AU apps — pick where to go
        next, then sign in once there.
      </p>
      {email ? (
        <p className="mt-2 text-center text-xs text-ink-soft">
          Signed up as <span className="font-semibold text-ink">{email}</span>
        </p>
      ) : null}

      <div className="mt-10 border border-rule bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] sm:p-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
          Where next?
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <DestinationCard
            href={scoreHref}
            title="AU Score"
            blurb="Live matches, clubs, and campus sports."
            emphasized={hinted === "score"}
            app="score"
          />
          <DestinationCard
            href={digestHref}
            title="AU Digest"
            blurb="The student paper — news, culture, and campus life."
            emphasized={hinted === "digest"}
            app="digest"
          />
        </div>
        <p className="mt-5 text-center text-xs text-ink-soft">
          Sign in on the app you choose with the same password.
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-ink-soft">
        <Link href="/" className="font-semibold text-ink underline underline-offset-2">
          Stay on Campus
        </Link>
      </p>
    </div>
  );
}

function DestinationCard({
  href,
  title,
  blurb,
  emphasized,
  app,
}: {
  href: string;
  title: string;
  blurb: string;
  emphasized: boolean;
  app: AppDestination;
}) {
  return (
    <a
      href={href}
      className={`group flex flex-col border px-4 py-5 transition ${
        emphasized
          ? "border-ink bg-ink text-white"
          : "border-rule bg-white text-ink hover:border-ink"
      }`}
    >
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
          emphasized ? "text-white/70" : "text-ink-soft"
        }`}
      >
        {emphasized ? "Continue to" : app === "score" ? "Sports" : "News"}
      </span>
      <span className="mt-2 font-display text-xl font-extrabold tracking-tight">{title}</span>
      <span
        className={`mt-2 text-sm leading-relaxed ${
          emphasized ? "text-white/80" : "text-ink-soft"
        }`}
      >
        {blurb}
      </span>
      <span
        className={`mt-4 text-xs font-bold uppercase tracking-wider ${
          emphasized ? "text-white" : "text-accent group-hover:text-ink"
        }`}
      >
        {emphasized ? "Continue →" : "Open →"}
      </span>
    </a>
  );
}
