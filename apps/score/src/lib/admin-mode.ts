/** Cookie: elevated admin surface is intentionally separate from normal browsing. */
export const ADMIN_MODE_COOKIE = "au_admin_mode";

export function parseAdminModeCookie(value?: string | null): boolean {
  return value === "on";
}

export function adminModeCookieOptions(enabled: boolean) {
  return {
    name: ADMIN_MODE_COOKIE,
    value: enabled ? "on" : "off",
    path: "/",
    maxAge: 60 * 60 * 12, // half day — forces re-confirm regularly
    sameSite: "lax" as const,
  };
}
