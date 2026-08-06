import { redirect } from "next/navigation";

/** Campus is signup-only — sign in on AU Score (or Digest for editions). */
export default function LoginPage() {
  redirect("/signup");
}
