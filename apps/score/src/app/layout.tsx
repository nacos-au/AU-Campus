import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AU Score — Campus Sports",
    template: "%s | AU Score",
  },
  description:
    "Campus sports matches, league tables, and player statistics for university athletics.",
  openGraph: {
    title: "AU Score — Campus Sports",
    description:
      "Campus sports matches, league tables, and player statistics for university athletics.",
    siteName: "AU Score",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AU Score — Campus Sports",
    description:
      "Campus sports matches, league tables, and player statistics for university athletics.",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-white font-sans text-ink">
        <QueryProvider>
          <ConfirmProvider>
            <SiteHeader />
            <main className="flex-1 bg-white">{children}</main>
            <SiteFooter />
          </ConfirmProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
