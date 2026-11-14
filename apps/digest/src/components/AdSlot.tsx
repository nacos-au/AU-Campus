import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { pickAd, SLOT_DIMENSIONS } from "@/lib/ads";
import { DEMO_MODE_COOKIE, isDemoMode } from "@/lib/demo-mode";
import { isAdminModeActive } from "@/app/actions/admin-mode";
import type { Ad, AdSlot as Slot } from "@/lib/types";
import { digestFeatures } from "@/lib/features";
import { AdBeacon } from "./AdBeacon";
import { AdSenseUnit } from "./AdSenseUnit";

/**
 * Server component. One placement = one house ad (weighted, in-flight),
 * else a programmatic unit if configured, else nothing. Never shown to
 * staff in Admin Mode.
 */
export async function AdSlot({
  slot,
  className = "",
}: {
  slot: Slot;
  className?: string;
}) {
  if (await isAdminModeActive()) return null;

  const [supabase, t, cookieStore] = await Promise.all([
    createClient(),
    getTranslations("home"),
    cookies(),
  ]);
  const demo = isDemoMode(cookieStore.get(DEMO_MODE_COOKIE)?.value);

  const { data } = await supabase
    .from("ads")
    .select("*")
    .eq("slot", slot)
    .eq("active", true);

  const ad = pickAd((data ?? []) as Ad[]);
  const dim = SLOT_DIMENSIONS[slot];

  if (!ad) {
    if (!digestFeatures.adsenseFallback || demo) return null;
    const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    const unit = process.env[`NEXT_PUBLIC_ADSENSE_SLOT_${slot.toUpperCase()}`];
    if (!client || !unit) return null;
    return (
      <div className={`text-center ${className}`}>
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          {t("advertisement")}
        </p>
        <AdSenseUnit client={client} unit={unit} width={dim.w} height={dim.h} />
      </div>
    );
  }

  const href = demo ? ad.target_url : `/api/ad/${ad.id}`;

  return (
    <div className={`text-center ${className}`}>
      <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {t("advertisement")}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="inline-block border border-rule"
      >
        <Image
          src={ad.image_url}
          alt={ad.label}
          width={dim.w}
          height={dim.h}
          className="h-auto w-full max-w-full"
        />
      </a>
      {!demo && <AdBeacon id={ad.id} />}
    </div>
  );
}
