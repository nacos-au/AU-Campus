"use client";

import { useEffect } from "react";

/** Counts one impression per render, from the browser (survives page caching). */
export function AdBeacon({ id }: { id: string }) {
  useEffect(() => {
    const body = JSON.stringify({ ids: [id] });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/ad/impression", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/ad/impression", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [id]);
  return null;
}
