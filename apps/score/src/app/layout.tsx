import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { DataModeBanner } from "@/components/layout/data-mode-banner";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "AU Score — Campus Sports",
    template: "%s | AU Score",
  },
  description:
    "Campus sports matches, league tables, and player statistics for university athletics.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white font-sans text-ink">
        <QueryProvider>
          <SiteHeader />
          <DataModeBanner />
          <main className="flex-1 bg-white">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
