import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config";

// Lets people add the site to their home screen like an app (needed for notifications on iPhone).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: "Buy and sell pre-loved items across Nigeria, with your money protected.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F2EA",
    theme_color: "#4A5A2B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
