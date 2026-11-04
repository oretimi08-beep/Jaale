import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { BRAND } from "@/lib/config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/Toaster";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700", "800"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} · Buy and sell pre-loved items in Nigeria`, template: `%s · ${BRAND.name}` },
  description:
    "Buy and sell pre-loved fashion, furniture and appliances across Nigeria. Your money stays protected until the item is in your hands.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFDF8" },
    { media: "(prefers-color-scheme: dark)", color: "#1C2017" },
  ],
};

// Applies the saved light/dark choice before the page paints, so there is no flash.
const themeScript = `try{var t=localStorage.getItem("jaale-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${bricolage.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Header />
        <div style={{ minHeight: "60vh" }}>{children}</div>
        <Footer />
        <Suspense>
          <Toaster />
        </Suspense>
      </body>
    </html>
  );
}
