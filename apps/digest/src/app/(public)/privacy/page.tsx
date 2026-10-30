import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="article-body mx-auto max-w-2xl py-10">
      <h1 className="font-serif text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Last updated {new Date().toLocaleDateString("en-GB", { dateStyle: "long" })}
      </p>

      <h2>What we collect</h2>
      <p>
        When you create an account we store your name, email address and, if
        you choose to verify as a student, your matriculation number. When you
        buy an edition, Paystack processes your payment; we keep only the
        transaction reference and amount, never your card details.
      </p>

      <h2>How we use it</h2>
      <p>
        To sign you in, unlock editions you have bought, let you like stories
        and take part in forums, and to contact you about your account. We do
        not sell your personal information.
      </p>

      <h2>Advertising</h2>
      <p>
        {site.name} shows a small number of clearly labelled advertisements.
        For ads sold directly, we count views and clicks in aggregate and
        store no personal data. Where third-party ad networks such as Google
        AdSense are used, those networks may set cookies to serve relevant
        ads; you can opt out at{" "}
        <a href="https://adssettings.google.com">adssettings.google.com</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies to keep you signed in, remember your language, and
        remember whether you are viewing demo or live content.
      </p>

      <h2>Your choices</h2>
      <p>
        You can update your profile in Account settings or ask us to delete
        your account by contacting the newsroom. Deleting your account removes
        your profile, likes and forum posts; purchase records are kept as
        required for accounting.
      </p>

      <h2>Contact</h2>
      <p>
        {site.name}, {site.university}, {site.address}.
      </p>
    </article>
  );
}
