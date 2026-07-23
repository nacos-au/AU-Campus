const CAMPUS_URL = process.env.NEXT_PUBLIC_CAMPUS_URL ?? "http://localhost:3000";
const DIGEST_URL = process.env.NEXT_PUBLIC_DIGEST_URL ?? "http://localhost:3001";
const SCORE_URL = process.env.NEXT_PUBLIC_SCORE_URL ?? "http://localhost:3002";

export { CAMPUS_URL, DIGEST_URL, SCORE_URL };

export function digestAuthUrl(path: "login" | "signup", returnTo = CAMPUS_URL) {
  const url = new URL(`/${path}`, DIGEST_URL);
  url.searchParams.set("next", returnTo);
  return url.toString();
}
