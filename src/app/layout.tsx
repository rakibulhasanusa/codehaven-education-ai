import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToasterProvider } from "@/components/ui/toaster";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bn-sans",
  weight: ["400", "500", "600", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://codehaveneduai.com"),
  title: {
    default: "CodeHaven Education AI",
    template: "%s | CodeHaven Education AI",
  },
  description:
    "CodeHaven Education AI is an AI Learning Intelligence System for BCS, academic students, coaching centers, and educational institutions.",
  applicationName: "CodeHaven Education AI",
  keywords: [
    "CodeHaven Education AI",
    "AI Learning Intelligence System",
    "AI exam platform",
    "BCS preparation",
    "smart exam generation",
    "MCQ generation",
    "student performance analytics",
    "coaching management software",
    "educational institution analytics",
  ],
  openGraph: {
    type: "website",
    siteName: "CodeHaven Education AI",
    title: "CodeHaven Education AI",
    description:
      "Premium AI Learning Intelligence System with smart exam generation, analytics, and recommendations.",
    url: "/",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "CodeHaven Education AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeHaven Education AI",
    description:
      "AI Learning Intelligence System for BCS, academic learners, coaching centers, and institutions.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased hydrated",
        geistSans.variable,
        geistMono.variable,
        figtree.variable,
        notoSansBengali.variable,
        "font-sans"
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ToasterProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </ToasterProvider>
      </body>
    </html>
  );
}
