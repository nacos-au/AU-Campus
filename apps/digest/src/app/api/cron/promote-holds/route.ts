import { NextResponse } from "next/server";

/**
 * OUT OF SCOPE — timed / cron auto-release (see docs/OUT_OF_SCOPE.md).
 * Parked posts go live only when an editor runs publish_parked_article.
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "Timed release cron is out of scope. Use Make live on a parked story.",
    },
    { status: 501 }
  );
}
