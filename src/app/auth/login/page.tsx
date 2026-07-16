import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";

export const metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <>
      <BrandedSection title="Sign In" activeSport="football" />
      <PageContent>
        <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
          <p className="mb-6 text-center text-sm opacity-70">Same login as AU Digest</p>
          <form className="space-y-4">
            <input
              type="text"
              placeholder="Email or matric number"
              className="w-full border border-rule px-4 py-3 focus:border-accent focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full border border-rule px-4 py-3 focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="w-full bg-accent py-3 font-display text-sm font-bold text-white"
            >
              Sign in
            </button>
          </form>
        </div>
      </PageContent>
    </>
  );
}
