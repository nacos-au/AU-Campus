import { redirect } from "next/navigation";

/** Prefer /signin for returning accounts; /login kept as alias. */
export default async function LoginAliasPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  redirect(`/signin${qs}`);
}
