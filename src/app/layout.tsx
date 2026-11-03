import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";
import { preload } from "react-dom";

import { GEO_URL } from "@/lib/geoAsset";
import { REDUCED_MOTION_KEY } from "@/lib/motion";
import { readRole } from "@/lib/roles.server";
import { WebVitals } from "@/lib/vitals";
import { Providers } from "./providers";
import "./globals.css";

const display = Source_Serif_4({
  subsets: ["latin"],
  // Two static weights, no variable file and no italic: about half the bytes of the optical-size axis, and the
  // headlines never go past 36px where the axis would matter.
  weight: ["400", "600"],
  style: "normal",
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const ui = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Market Ops",
  description:
    "Market operations console: portfolio performance, forecast attainment and an assistant.",
};

// Applies a stored theme before first paint so there is no flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem("mo.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
// Same for the console's Reduce motion switch.
const MOTION_SCRIPT = `try{if(localStorage.getItem("${REDUCED_MOTION_KEY}")==="true")document.documentElement.setAttribute("data-reduced-motion","true")}catch(e){}`;

// Density follows the mode in the URL, or the signed-in role when the URL has none (lib/density.ts keeps it in
// step afterwards). Set before first paint, the server-rendered Analyst view already has its compact rows and
// header; set after hydration it re-flowed the whole page and was the layout shift Lighthouse reported on
// Analyst links. "overview" is the old name of "executive", which the proxy redirects.
const densityScript = (role: string) =>
  `try{var m=new URLSearchParams(location.search).get("mode");document.documentElement.setAttribute("data-density",m==="analyst"?"analyst":m==="executive"||m==="overview"?"executive":"${role}")}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const role = await readRole();
  // Starts the map geometry with the HTML instead of after hydration. The request mode and credentials match
  // the fetch in MapCard (same-origin, so crossOrigin "anonymous"), which is what lets the browser reuse it.
  preload(GEO_URL, { as: "fetch", crossOrigin: "anonymous" });
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT + MOTION_SCRIPT + densityScript(role) }} />
      </head>
      <body>
        <Providers role={role}>
          <WebVitals />
          {children}
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
