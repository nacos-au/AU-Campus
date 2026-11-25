import { DIGEST_URL, SCORE_URL } from "@/lib/urls";

export type AppDestination = "digest" | "score";

export function classifyNext(next: string | null | undefined): AppDestination | null {
  if (!next) return null;
  try {
    if (next.startsWith("/") && !next.startsWith("//")) return null;
    const target = new URL(next);
    if (target.origin === new URL(DIGEST_URL).origin) return "digest";
    if (target.origin === new URL(SCORE_URL).origin) return "score";
  } catch {
    // ignore
  }
  return null;
}

/** Path (+ search/hash) to pass as next on the target app, defaulting to home. */
export function pathFromNext(next: string | null | undefined, app: AppDestination): string {
  const origin = app === "digest" ? DIGEST_URL : SCORE_URL;
  if (!next || (next.startsWith("/") && !next.startsWith("//"))) return "/";
  try {
    const target = new URL(next);
    if (target.origin !== new URL(origin).origin) return "/";
    return `${target.pathname}${target.search}${target.hash}` || "/";
  } catch {
    return "/";
  }
}

export function digestSignInUrl(email: string, nextPath: string): string {
  const url = new URL("/login", DIGEST_URL);
  if (email) url.searchParams.set("email", email);
  if (nextPath && nextPath !== "/") url.searchParams.set("next", nextPath);
  return url.toString();
}

export function scoreSignInUrl(email: string, nextPath: string): string {
  const url = new URL("/", SCORE_URL);
  url.searchParams.set("auth", "signin");
  if (email) url.searchParams.set("email", email);
  if (nextPath && nextPath !== "/") url.searchParams.set("next", nextPath);
  return url.toString();
}

export function welcomeUrl(next: string | null | undefined): string {
  const url = new URL("/welcome", "http://local.invalid");
  if (next && next !== "/") url.searchParams.set("next", next);
  return `${url.pathname}${url.search}`;
}
