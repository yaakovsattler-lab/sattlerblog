import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

/*
 * Almoni Neue, self-hosted, with the same weight mapping the built site uses
 * (site/src/app/layout.tsx). The Figma frame is set in Afek 1.5 AAA / Liebling
 * Pro / Rubik because the Figma font connection was never synced to the real
 * family; the design lead ruled on 04.09 that those names are the artifact
 * and Almoni Neue is the decision. Regular 400, Medium 500, Bold 700, UltraBold 800,
 * Black 900, Ultrablack 950.
 *
 * 18.09: Liebling Pro was loaded here for part of a day on Elyakim's
 * instruction and then reverted on his instruction - the 04.09 ruling stands
 * and nothing in this file contradicts it any more. Kept as a note rather than
 * deleted so the round is not rediscovered: Liebling Pro is not on Google
 * Fonts, the files that existed came from a 2017 desktop install, and a
 * desktop licence is not a web licence.
 */
const almoniNeue = localFont({
  src: [
    { path: "../fonts/AlmoniNeue-Regular.otf", weight: "400" },
    { path: "../fonts/AlmoniNeue-Medium.otf", weight: "500" },
    { path: "../fonts/AlmoniNeue-Bold.otf", weight: "700" },
    { path: "../fonts/AlmoniNeue-Ultrabold.otf", weight: "800" },
    { path: "../fonts/AlmoniNeue-Black.otf", weight: "900" },
    { path: "../fonts/AlmoniNeue-Ultrablack.otf", weight: "950" },
  ],
  variable: "--font-family-base",
  display: "swap",
  fallback: ["Arial Hebrew", "Noto Sans Hebrew", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "יעקב סאטלר", template: "%s · יעקב סאטלר" },
  description: "כלכלה אישית בלי בולשיט.",
};

/* Without this the layout viewport is not the device width and every vh unit
   resolves against something taller than the visible area - which is how the
   contact sheet ended up taller than the screen with its submit button below
   the fold. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/*
 * Root layout: the document shell and the font only. The site's chrome
 * (navbar, footer, global stylesheet) lives in (site)/layout.tsx and in
 * not-found.tsx, so the embedded Studio at /studio gets none of it.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html dir="rtl" lang="he" className={almoniNeue.variable}>
      <body>{children}</body>
    </html>
  );
}
