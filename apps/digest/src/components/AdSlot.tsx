import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { pickAd } from "@/lib/ads";
import type { Ad, AdSlot as Slot } from "@/lib/types";

const SLOT_DIMENSIONS: Record<Slot, { w: number; h: number }> = {
  leaderboard: { w: 970, h: 250 },
  sidebar: { w: 300, h: 600 },
  infeed: { w: 600, h: 400 },
};

/** Server component. Renders one active ad for the slot, or nothing. */
export async function AdSlot({
  slot,
  className = "",
}: {
  slot: Slot;
  className?: string;
}) {
  const supabase = await createClient();
  const t = await getTranslations("home");

  const { data } = await supabase
    .from("ads")
    .select("*")
    .eq("slot", slot)
    .eq("active", true);

  const ad = pickAd((data ?? []) as Ad[]);
  if (!ad) return null;
  const dim = SLOT_DIMENSIONS[slot];

  return (
    <div className={`text-center ${className}`}>
      <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {t("advertisement")}
      </p>
      <a
        href={ad.target_url}
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
    </div>
  );
}
