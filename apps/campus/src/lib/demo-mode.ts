/** Matches Digest/Score — apps read `?demo=1|0` on arrival. */
export const DEMO_MODE_COOKIE = "au_demo_mode";

export function isPreferDemo(cookieValue?: string | null): boolean {
  if (cookieValue === "on") return true;
  if (cookieValue === "off") return false;
  return true;
}

export function demoModeCookieOptions(enabled: boolean) {
  return {
    name: DEMO_MODE_COOKIE,
    value: enabled ? "on" : "off",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
}

export function withDemoParam(baseUrl: string, preferDemo: boolean): string {
  const url = new URL(baseUrl);
  url.searchParams.set("demo", preferDemo ? "1" : "0");
  return url.toString();
}
