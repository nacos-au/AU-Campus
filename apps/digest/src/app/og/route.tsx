import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "").trim().slice(0, 80);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#111111",
            lineHeight: 1.05,
            textAlign: "center",
          }}
        >
          {site.name}
        </div>
        {title ? (
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 28,
              color: "#555555",
              textAlign: "center",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              marginTop: 20,
              width: 120,
              height: 3,
              backgroundColor: "#111111",
            }}
          />
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
