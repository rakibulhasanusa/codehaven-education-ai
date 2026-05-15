import type { Metadata } from "next";
import PublicNavbar from "@/components/navbars/public-navbar";
import PremiumHomepage from "@/components/home/premium-homepage";
import PublicFooter from "@/components/navbars/public-footer";
import { getAuthUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  metadataBase: new URL("https://codehaven-ai.vercel.app"),
  title: "AI Learning Intelligence System for Smart Exam Success",
  description:
    "CodeHaven Education AI provides AI-powered smart exam generation, subject-based MCQ intelligence, real-time dashboards, and performance analytics.",
  alternates: {
    canonical: "https://codehaven-ai.vercel.app",
  },
  openGraph: {
    title: "CodeHaven Education AI | AI Learning Intelligence System",
    description:
      "AI-powered smart exam generation, performance analytics, weakness detection, and coaching intelligence.",
    url: "https://codehaven-ai.vercel.app",
    siteName: "CodeHaven Education AI",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "CodeHaven Education AI Homepage",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeHaven Education AI",
    description:
      "AI Learning Intelligence System for BCS students, academic learners, and coaching institutes.",
    images: ["/twitter-image"],
  },
};

export default async function Home() {
  let user: Awaited<ReturnType<typeof getAuthUser>> = null;
  try {
    user = await getAuthUser();
  } catch {
    user = null;
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "CodeHaven Education AI",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        description:
          "AI Learning Intelligence System for smart exam generation, weakness detection, and student performance analytics.",
        audience: {
          "@type": "Audience",
          audienceType: "BCS students, academic students, coaching centers, educational institutions",
        },
        provider: {
          "@type": "Organization",
          name: "CodeHaven Education AI",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "AI Learning Intelligence Platform টি কার জন্য?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "BCS পরীক্ষার্থী, একাডেমিক শিক্ষার্থী, কোচিং সেন্টার এবং শিক্ষা প্রতিষ্ঠানের জন্য এই প্ল্যাটফর্মটি তৈরি করা হয়েছে।",
            },
          },
          {
            "@type": "Question",
            name: "এই প্ল্যাটফর্মে কীভাবে স্মার্ট পরীক্ষা তৈরি হয়?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "বিষয় ও লেভেল নির্বাচন করলে AI ব্যালান্সড MCQ সেট তৈরি করে এবং দুর্বল টপিক অনুযায়ী রিকমেন্ডেশন দেয়।",
            },
          },
          {
            "@type": "Question",
            name: "পারফরম্যান্স অ্যানালিটিক্সে কী দেখা যায়?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "স্কোর ট্রেন্ড, নির্ভুলতা, দুর্বল অধ্যায়, সময়ভিত্তিক আচরণ এবং উন্নতির জন্য ইনসাইট দেখা যায়।",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNavbar />
      <PremiumHomepage isLoggedIn={!!user} isAdmin={user?.role === "admin"} />
      <PublicFooter />
    </>
  );
}
