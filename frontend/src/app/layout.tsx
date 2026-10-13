import type { Metadata } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const display = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VesselVision: CAD risk visualization",
  description:
    "See heart-disease risk per artery on an interactive 3D heart, with plain-word reasons for every result. Decision support only.",
};

/** Pre-paint theme: stored choice wins, else OS preference. Runs before
 *  first paint so the toggle never flashes the wrong theme. */
const themeInit = `(function(){try{var t=localStorage.getItem("vesselvision-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

const configured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");

export default function RootLayout({ children }: LayoutProps<"/">) {
  // suppressHydrationWarning below: the theme script sets data-theme
  // pre-hydration, so the attribute legitimately differs from SSR HTML.
  // This is the documented Next.js dark-mode pattern.
  const body = (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInit }} />
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
  // Without real Clerk keys the provider would throw; render bare so the
  // landing documents setup instead. Production must set both keys.
  if (!configured) return body;
  return <ClerkProvider>{body}</ClerkProvider>;
}
