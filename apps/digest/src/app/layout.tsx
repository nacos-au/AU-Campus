import type { Metadata } from "next";
import {
  Averia_Serif_Libre,
  Libre_Franklin,
  Source_Serif_4,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { isRtlLocale } from "@/i18n/locales";
import { site } from "@/lib/site";
import "./globals.css";

const franklin = Libre_Franklin({
  variable: "--font-franklin",
  subsets: ["latin", "latin-ext"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext"],
});

const masthead = Averia_Serif_Libre({
  variable: "--font-averia",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.university}`,
    template: `%s — ${site.name}`,
  },
  description: site.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={isRtlLocale(locale) ? "rtl" : "ltr"}
      className={`${franklin.variable} ${sourceSerif.variable} ${masthead.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
