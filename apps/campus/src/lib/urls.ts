import { withDemoParam } from "@/lib/demo-mode";

const CAMPUS_URL = process.env.NEXT_PUBLIC_CAMPUS_URL ?? "http://localhost:3000";
const DIGEST_URL = process.env.NEXT_PUBLIC_DIGEST_URL ?? "http://localhost:3001";
const SCORE_URL = process.env.NEXT_PUBLIC_SCORE_URL ?? "http://localhost:3002";

export { CAMPUS_URL, DIGEST_URL, SCORE_URL };

export function digestAuthUrl(
  path: "login" | "signup",
  returnTo = CAMPUS_URL,
  preferDemo?: boolean
) {
  const url = new URL(`/${path}`, DIGEST_URL);
  url.searchParams.set("next", returnTo);
  if (preferDemo !== undefined) {
    url.searchParams.set("demo", preferDemo ? "1" : "0");
  }
  return url.toString();
}

export function appUrl(base: string, preferDemo: boolean) {
  return withDemoParam(base, preferDemo);
}
