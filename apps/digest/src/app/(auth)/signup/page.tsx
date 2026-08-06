import { redirect } from "next/navigation";

const CAMPUS_URL = process.env.NEXT_PUBLIC_CAMPUS_URL ?? "http://localhost:3000";

/** Account creation is only on AU Campus. */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const url = new URL("/signup", CAMPUS_URL);
  if (next) url.searchParams.set("next", next);
  redirect(url.toString());
}
