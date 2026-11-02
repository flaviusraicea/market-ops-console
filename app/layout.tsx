import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";

import { WebVitals } from "@/lib/observability/vitals";
import { Providers } from "./providers";
import "./globals.css";

const display = Source_Serif_4({
  subsets: ["latin"],
  // next/font only allows the opsz axis on the variable font, so weight is left to the axis (covers 400 and 600).
  axes: ["opsz"],
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <WebVitals />
          {children}
        </Providers>
      </body>
    </html>
  );
}
