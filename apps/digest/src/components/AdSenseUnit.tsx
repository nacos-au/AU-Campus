"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** Fixed-size AdSense unit — reserves its box so nothing shifts. */
export function AdSenseUnit({
  client,
  unit,
  width,
  height,
}: {
  client: string;
  unit: string;
  width: number;
  height: number;
}) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocked */
    }
  }, []);

  return (
    <>
      <Script
        id="adsense"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        crossOrigin="anonymous"
      />
      <div
        className="mx-auto w-full overflow-hidden"
        style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client={client}
          data-ad-slot={unit}
          data-full-width-responsive="false"
        />
      </div>
    </>
  );
}
