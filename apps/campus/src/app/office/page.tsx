import { requireSuperAdminSession } from "@/lib/platform-roles";
import { parseOfficeModeCookie, OFFICE_MODE_COOKIE } from "@/lib/admin-mode";
import { cookies } from "next/headers";
import { EnterOfficeButton } from "@/components/office/office-mode-controls";
import { OfficeDashboard } from "@/components/office/office-dashboard";
import Link from "next/link";

export const metadata = { title: "Campus Office" };
export const dynamic = "force-dynamic";

export default async function OfficePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const staff = await requireSuperAdminSession();
  const { mode } = await searchParams;
  const store = await cookies();
  const officeOn = parseOfficeModeCookie(store.get(OFFICE_MODE_COOKIE)?.value);

  if (!officeOn) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0c0608]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 80% -10%, rgba(122,31,43,0.45), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 100%, rgba(0,78,40,0.35), transparent 50%)",
          }}
          aria-hidden
        />
        <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
            Super admin gate
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">
            Campus Office
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            {mode === "required"
              ? "Office Mode is required before you can grant roles or open the command centre."
              : `Welcome, ${staff.displayName}. Enter Office Mode to unlock the control room.`}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <EnterOfficeButton />
            <Link href="/" className="text-xs font-bold text-white/50 hover:text-white">
              Back to Campus
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0608]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 80% -10%, rgba(122,31,43,0.4), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(0,78,40,0.3), transparent 50%)",
        }}
        aria-hidden
      />
      <div className="relative z-10">
        <div className="border-b border-white/10 bg-accent px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-white">
          Office Mode — live role changes across Campus, Digest & Score
        </div>
        <OfficeDashboard staff={staff} />
      </div>
    </div>
  );
}
