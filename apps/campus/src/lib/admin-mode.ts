/** Campus Office elevation — separate from normal browsing. */
export const OFFICE_MODE_COOKIE = "au_campus_office_mode";

export function parseOfficeModeCookie(value?: string | null): boolean {
  return value === "on";
}

export function officeModeCookieOptions(enabled: boolean) {
  return {
    name: OFFICE_MODE_COOKIE,
    value: enabled ? "on" : "off",
    path: "/",
    maxAge: 60 * 60 * 12,
    sameSite: "lax" as const,
  };
}
