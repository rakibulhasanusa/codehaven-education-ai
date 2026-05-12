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
  title: "MCQ Smart Exam",
  description: "Timed MCQ practice with result analytics and smart review",
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
