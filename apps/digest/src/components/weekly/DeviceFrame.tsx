"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Device = "phone" | "tablet" | "desktop";

/** CSS pixel width of each simulated viewport. */
export const DEVICE_WIDTH: Record<Device, number> = {
  phone: 390,
  tablet: 820,
  desktop: 1280,
};

/**
 * Renders children at a fixed device width, scaled down to fit the available
 * space. The children lay out at the TRUE device width (so container queries
 * in <WeeklyPage /> reflow exactly as they would on that device); only the
 * paint is scaled.
 */
export function DeviceFrame({
  device,
  children,
}: {
  device: Device;
  children: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  const [innerH, setInnerH] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      setAvail(outer.clientWidth);
      setInnerH(inner.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  const width = DEVICE_WIDTH[device];
  const bezel = device === "desktop" ? 0 : 10;
  const scale = avail > 0 ? Math.min(1, (avail - 4) / (width + bezel * 2)) : 1;
  const frameW = width + bezel * 2;

  return (
    <div ref={outerRef} className="w-full">
      <div
        className="mx-auto"
        style={{ width: frameW * scale, height: (innerH + bezel * 2) * scale }}
      >
        <div
          style={{
            width: frameW,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            padding: bezel,
          }}
          className={
            device === "desktop"
              ? "bg-paper shadow-md ring-1 ring-black/10"
              : "rounded-[2rem] bg-ink shadow-lg"
          }
        >
          <div
            ref={innerRef}
            style={{ width }}
            className={`bg-paper px-4 ${
              device === "desktop" ? "" : "overflow-hidden rounded-[1.5rem]"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
