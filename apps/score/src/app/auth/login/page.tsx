import { redirect } from "next/navigation";

/** Legacy login route — opens the centered auth modal on the home page. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const params = new URLSearchParams();
  params.set("auth", "signin");
  if (next) params.set("next", next);
  redirect(`/?${params.toString()}`);
}
