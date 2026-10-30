import Link from "next/link";

export function ForumGate({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="font-serif text-4xl font-bold">Forum</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        {signedIn
          ? "A super admin verifies members in person before they can read or post here. Reading the paper does not require that step."
          : "Sign in with a verified account to read and join the forum."}
      </p>
      {!signedIn && (
        <Link
          href="/login?next=/forum"
          className="mt-6 inline-block bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
