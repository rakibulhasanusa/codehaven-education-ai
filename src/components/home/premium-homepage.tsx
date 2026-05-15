"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Sparkles,
  Radar,
  Building2,
  ChartNoAxesCombined,
  CircleAlert,
  LibraryBig,
  Activity,
  BookOpen,
  WandSparkles,
  FileCheck2,
  Bot,
  Users,
  FolderKanban,
  BarChart3,
  ArrowRight,
  Zap,
} from "lucide-react";


const EASE_OUT_CUBIC: [number, number, number, number] = [0.22, 1, 0.36, 1];

function ChartPlaceholder({ height }: { height: number }) {
  return <div className="premium-surface w-full animate-pulse rounded-xl bg-muted/40" style={{ height }} />;
}

const LineChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((m) => m.LineChart),
  { ssr: false, loading: () => <ChartPlaceholder height={220} /> },
);
const RealtimeChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((m) => m.RealtimeChart),
  { ssr: false, loading: () => <ChartPlaceholder height={220} /> },
);
const AreaChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((m) => m.AreaChart),
  { ssr: false, loading: () => <ChartPlaceholder height={200} /> },
);
const BarChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((m) => m.BarChart),
  { ssr: false, loading: () => <ChartPlaceholder height={200} /> },
);

const contactLink = process.env.NEXT_PUBLIC_CONTACT_URL || "/login";

const stats = [
  { label: "মোট প্রশ্ন",           value: "২০০০+",  suffix: "" },
  { label: "মোট পরীক্ষা",          value: "৯৬+",   suffix: "" },
  { label: "সক্রিয় শিক্ষার্থী",   value: "১৮০+",  suffix: "" },
  { label: "অ্যানালিটিক্স নির্ভুলতা", value: "৯৯", suffix: "%" },
];

const features = [
  { title: "AI প্রশ্ন তৈরি",         desc: "এম্বেডেড বিষয়ভিত্তিক ডাটাবেস থেকে স্মার্ট এমসিকিউ তৈরি করুন।",                   icon: Brain           },
  { title: "পারফরম্যান্স অ্যানালিটিক্স", desc: "স্কোর ট্রেন্ড, গতি ও ধারাবাহিকতা ট্র্যাক করুন।",                        icon: ChartNoAxesCombined },
  { title: "স্মার্ট রিকমেন্ডেশন",   desc: "লাইভ ফলাফলের ভিত্তিতে AI নির্দেশিত উন্নয়ন পরিকল্পনা পান।",                    icon: Sparkles        },
  { title: "কোচিং ম্যানেজমেন্ট",    desc: "ব্যাচ, পরীক্ষা, শিক্ষক ও রিপোর্টিং এক জায়গায় পরিচালনা করুন।",                   icon: Building2       },
  { title: "লাইভ ড্যাশবোর্ড",       desc: "রিয়েল-টাইমে পরীক্ষা কার্যক্রম ও লিডারবোর্ড পর্যবেক্ষণ করুন।",                  icon: Radar           },
  { title: "দুর্বলতা শনাক্তকরণ",    desc: "বিষয়, অধ্যায় ও প্রশ্ন আচরণ অনুযায়ী দুর্বল টপিক শনাক্ত করুন।",               icon: CircleAlert     },
  { title: "বিষয়ভিত্তিক পরীক্ষা",  desc: "সিলেবাস লক্ষ্য অনুযায়ী বিষয়ভিত্তিক পরীক্ষা তৈরি করুন।",                        icon: LibraryBig      },
  { title: "রিয়েল-টাইম বিশ্লেষণ",  desc: "পরীক্ষা চলাকালীনই উত্তরের মান বিশ্লেষণ করুন।",                                  icon: Activity        },
];

const steps = [
  { title: "বিষয় নির্বাচন",       text: "BCS, একাডেমিক বা প্রতিষ্ঠানভিত্তিক বিষয় বেছে নিন।",                    icon: BookOpen    },
  { title: "স্মার্ট পরীক্ষা তৈরি", text: "AI সাথে সাথে ব্যালান্সড ও লেভেল-অ্যাওয়ার এমসিকিউ তৈরি করে।",            icon: WandSparkles },
  { title: "পরীক্ষা দিন",          text: "শিক্ষার্থীরা নির্ধারিত সময়ের প্রিমিয়াম ইন্টারফেসে পরীক্ষা দেয়।",        icon: FileCheck2  },
  { title: "AI বিশ্লেষণ পান",      text: "দুর্বলতা ম্যাপ ও রিকমেন্ডেশনভিত্তিক কোচিং ইনসাইট পান।",                icon: Bot         },
];

const faqs = [
  {
    q: "AI Learning Intelligence Platform টি কার জন্য?",
    a: "BCS পরীক্ষার্থী, একাডেমিক শিক্ষার্থী, কোচিং সেন্টার এবং শিক্ষা প্রতিষ্ঠানের জন্য এই প্ল্যাটফর্মটি তৈরি করা হয়েছে।",
  },
  {
    q: "এই প্ল্যাটফর্মে কীভাবে স্মার্ট পরীক্ষা তৈরি হয়?",
    a: "বিষয় ও লেভেল নির্বাচন করলে AI ব্যালান্সড MCQ সেট তৈরি করে এবং দুর্বল টপিক অনুযায়ী রিকমেন্ডেশন দেয়।",
  },
  {
    q: "পারফরম্যান্স অ্যানালিটিক্সে কী দেখা যায়?",
    a: "স্কোর ট্রেন্ড, নির্ভুলতা, দুর্বল অধ্যায়, সময়ভিত্তিক আচরণ এবং উন্নতির জন্য ইনসাইট দেখা যায়।",
  },
  {
    q: "অ্যাকাউন্ট খোলার জন্য কী করতে হবে?",
    a: "বর্তমানে সরাসরি সাইন-আপ চালু নেই। কনট্যাক্ট অপশনে ক্লিক করে অ্যাকাউন্ট এক্সেসের জন্য যোগাযোগ করতে হবে।",
  },
];

const accuracyTrend    = [{ label: "W1", value: 71 }, { label: "W2", value: 74 }, { label: "W3", value: 78 }, { label: "W4", value: 82 }, { label: "W5", value: 85 }, { label: "W6", value: 88 }];
const performanceTrend = [{ label: "Mon", value: 62 }, { label: "Tue", value: 69 }, { label: "Wed", value: 73 }, { label: "Thu", value: 78 }, { label: "Fri", value: 84 }, { label: "Sat", value: 87 }];
const weakTopics       = [{ label: "Math", value: 42 }, { label: "English", value: 31 }, { label: "GK", value: 28 }, { label: "Science", value: 19 }, { label: "ICT", value: 15 }];
const liveEvents       = Array.from({ length: 24 }, (_, i) => ({ label: `${i + 1}`, value: 18 + Math.round(Math.sin(i / 2.3) * 9 + ((i % 5) * 2)) }));

// ── animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show:   (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.07, ease: EASE_OUT_CUBIC } }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  show:   (i: number) => ({ opacity: 1, transition: { duration: 0.5, delay: i * 0.06 } }),
};

// ── section wrapper with consistent spacing ───────────────────────────────────
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}

// ── section heading ───────────────────────────────────────────────────────────
function SectionHeading({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-10">
      {kicker && <p className="premium-kicker mb-2">{kicker}</p>}
      <h2 className="premium-title text-3xl font-extrabold leading-tight md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export default function PremiumHomepage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY    = useTransform(scrollYProgress, [0, 1], ["0%", shouldReduceMotion ? "0%" : "18%"]);
  const heroOpac = useTransform(scrollYProgress, [0, 0.7], [1, shouldReduceMotion ? 1 : 0]);

  useEffect(() => {
    const run = () => setShowDeferredSections(true);
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (win.requestIdleCallback) {
      const idleId = win.requestIdleCallback(run, { timeout: 1200 });
      return () => win.cancelIdleCallback?.(idleId);
    }
    const timeoutId = setTimeout(run, 250);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <main className="bn-readable relative overflow-hidden">

      {/* ── Global ambient background ────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 -top-40 hidden h-[700px] w-[700px] rounded-full bg-primary/8 blur-[120px] md:block" />
        <div className="absolute -right-40 top-60 hidden h-[500px] w-[500px] rounded-full bg-accent/10 blur-[100px] md:block" />
        <div className="absolute bottom-0 left-1/2 hidden h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[100px] md:block" />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <div ref={heroRef} className="relative">
        <motion.div style={{ y: heroY, opacity: heroOpac }}>
          <Section className="pb-0 pt-10 sm:pt-12 md:pt-20">
            {/* Top badge row */}
            <motion.div initial="hidden" animate="show" variants={fadeUp} custom={0} className="mb-5 flex flex-wrap items-center gap-2.5 sm:mb-6 sm:gap-3">
              <Badge className="gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                <Zap className="h-3 w-3" /> CodeHaven Education AI
              </Badge>
              <span className="hidden h-px flex-1 max-w-[80px] bg-border/60 sm:block" />
              <span className="hidden text-xs text-muted-foreground sm:block">AI-Powered Learning</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial="hidden" animate="show" variants={fadeUp} custom={1}
              className="premium-title max-w-5xl text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl md:text-[3.75rem] lg:text-[4.5rem]"
            >
              BCS, একাডেমিক ও কোচিং সাফল্যের জন্য
              <span className="relative mt-2 block w-fit pb-1 text-foreground opacity-100">
                AI Learning Intelligence
                {/* Decorative underline */}
                <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-primary via-accent to-transparent opacity-70" />
              </span>
            </motion.h1>
            <h2 className="mt-4 max-w-3xl text-sm font-semibold tracking-wide text-foreground/90 md:text-base">
              AI Exam Platform for BCS & Academic Success
            </h2>
            <h3 className="mt-1 max-w-3xl text-sm text-muted-foreground md:text-base">
              BCS MCQ Practice, Smart Exam Generation, Performance Analytics, দুর্বলতা শনাক্তকরণ
            </h3>

            {/* Subtitle */}
            <motion.p
              initial="hidden" animate="show" variants={fadeUp} custom={2}
              className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
            >
              স্মার্ট পরীক্ষা তৈরি, বিষয়ভিত্তিক ইন্টেলিজেন্স, দুর্বলতা শনাক্তকরণ,
              AI রিকমেন্ডেশন এবং রিয়েল-টাইম কোচিং অ্যানালিটিক্স এক প্ল্যাটফর্মে।
            </motion.p>

            {/* CTAs */}
            <motion.div initial="hidden" animate="show" variants={fadeUp} custom={3} className="mt-7 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <Button asChild size="lg" className="h-11 w-full gap-2 rounded-full px-7 font-semibold shadow-lg shadow-primary/20 sm:w-auto">
                    <Link href="/login">প্ল্যাটফর্ম শুরু করুন <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-11 w-full rounded-full px-7 sm:w-auto">
                    <Link href="/smart-exam">AI স্মার্ট পরীক্ষা দেখুন</Link>
                  </Button>
            </motion.div>

            {/* Hero chart panel */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: EASE_OUT_CUBIC }}
              className="mt-10 sm:mt-12"
            >
              <div className="premium-panel relative overflow-hidden rounded-3xl p-1">
                {/* Inner glow */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                <div className="grid gap-3 rounded-[calc(1.5rem-4px)] bg-background/60 p-4 backdrop-blur lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <LineChart
                      title="নির্ভুলতার ট্রাজেক্টরি"
                      subtitle="AI-ট্র্যাকড উত্তরের নির্ভুলতার প্রবণতা"
                      data={accuracyTrend}
                      valueLabel="%"
                      height={220}
                      className="premium-surface"
                    />
                  </div>
                  <div>
                    <RealtimeChart
                      title="লাইভ পরীক্ষা কার্যক্রম"
                      subtitle="রিয়েল-টাইম উত্তর ইভেন্ট"
                      data={liveEvents}
                      height={220}
                      className="premium-surface"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </Section>
        </motion.div>
      </div>

      {showDeferredSections ? (
        <>
          {/* ══════════════════════════════════════════════════════════════
              STATS
          ══════════════════════════════════════════════════════════════ */}
          <Section className="pb-16 pt-16">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}
                  variants={fadeUp} custom={i}
                  className="premium-panel group relative overflow-hidden rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  {/* Accent corner */}
                  <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[3rem] bg-primary/5 transition-colors group-hover:bg-primary/10" />
                  <p className="relative text-4xl font-black tabular-nums text-primary">
                    {stat.value}<span className="text-2xl">{stat.suffix}</span>
                  </p>
                  <p className="relative mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════
              FEATURES
          ══════════════════════════════════════════════════════════════ */}
          <Section className="pb-20">
        <SectionHeading
          kicker="Features"
          title="স্মার্ট ফিচারসমূহ"
          subtitle="একটি মাত্র প্ল্যাটফর্মে BCS থেকে কোচিং পর্যন্ত সবকিছু।"
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp} custom={i % 4}
              className="premium-panel group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              {/* Icon bubble */}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-primary/8 shadow-sm transition-colors group-hover:bg-primary/15">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold leading-snug">{f.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>

              {/* Subtle bottom gradient accent */}
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-primary to-accent transition-all duration-500 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════
              HOW IT WORKS
          ══════════════════════════════════════════════════════════════ */}
          <Section className="pb-20">
        <SectionHeading kicker="Process" title="কিভাবে কাজ করে" />

        <div className="relative grid gap-6 md:grid-cols-4">
          {/* Connecting line (desktop) */}
          <div className="absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}
              variants={fadeUp} custom={i}
              className="premium-panel relative rounded-2xl p-5"
            >
              {/* Step number + icon */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                  ধাপ {i + 1}
                </span>
              </div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
            </motion.div>
          ))}
        </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════
              ANALYTICS PREVIEW
          ══════════════════════════════════════════════════════════════ */}
          <Section className="pb-20">
        <SectionHeading
          kicker="Intelligence Layer"
          title="AI অ্যানালিটিক্স প্রিভিউ"
          subtitle="দুর্বল টপিক, পারফরম্যান্স, সময়ের আচরণ এবং AI রিকমেন্ডেশন এক ইন্টেলিজেন্স লেয়ারে।"
        />

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Analytics */}
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp} custom={0}
            className="premium-panel overflow-hidden rounded-3xl"
          >
            <div className="border-b border-border/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <ChartNoAxesCombined className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">পারফরম্যান্স ড্যাশবোর্ড</span>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <AreaChart
                title="পারফরম্যান্স গ্রাফ"
                subtitle="সাপ্তাহিক উন্নতির প্যাটার্ন"
                data={performanceTrend}
                valueLabel="%"
                height={200}
                className="premium-surface"
              />
              <BarChart
                title="দুর্বল টপিক শনাক্তকরণ"
                subtitle="সবচেয়ে বেশি ভুল হওয়া বিষয়"
                data={weakTopics}
                valueLabel="ভুল"
                height={200}
                className="premium-surface"
              />
            </div>
          </motion.div>

          {/* Management system */}
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp} custom={1}
            className="premium-panel overflow-hidden rounded-3xl"
          >
            <div className="border-b border-border/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">স্মার্ট এক্সাম ম্যানেজমেন্ট</span>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-muted-foreground">
                একাডেমি ও প্রতিষ্ঠানের জন্য ইন্টেলিজেন্স-চালিত অ্যাডমিন ওয়ার্কস্পেস।
              </p>

              {/* Feature grid */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Users,        label: "শিক্ষার্থী ব্যবস্থাপনা",     desc: "ব্যাচ ও শিক্ষার্থী পরিচালনা"     },
                  { icon: FolderKanban, label: "প্রশ্নব্যাংক ব্যবস্থাপনা",   desc: "AI আপলোড ও সংগঠন"               },
                  { icon: BookOpen,     label: "পরীক্ষা তৈরি ও সময়সূচী",    desc: "নমনীয় সময় ও ধরন নিয়ন্ত্রণ"   },
                  { icon: BarChart3,    label: "অ্যানালিটিক্স রিপোর্ট",      desc: "লাইভ ও ঐতিহাসিক পারফরম্যান্স"   },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="group flex gap-3 rounded-xl border border-border/60 bg-background/60 p-3.5 transition-colors hover:border-primary/30 hover:bg-primary/4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 transition-colors group-hover:bg-primary/15">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live activity preview */}
              <div className="mt-5">
                <RealtimeChart
                  title="লাইভ পরীক্ষা কার্যক্রম"
                  subtitle="রিয়েল-টাইম উত্তর ইভেন্ট"
                  data={liveEvents.slice(0, 16)}
                  height={160}
                  className="premium-surface"
                />
              </div>

              {/* Mini stats row */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { val: "96K+",   lbl: "পরীক্ষা"   },
                  { val: "180K+",  lbl: "শিক্ষার্থী" },
                  { val: "98.7%",  lbl: "নির্ভুলতা"  },
                ].map(({ val, lbl }) => (
                  <div key={lbl} className="rounded-lg border border-border/50 bg-muted/30 px-2 py-2.5 text-center">
                    <p className="text-base font-black tabular-nums text-primary">{val}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════
              CTA
          ══════════════════════════════════════════════════════════════ */}
          <Section className="pb-20">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp} custom={0}
          className="premium-panel relative overflow-hidden rounded-3xl p-8 md:p-12"
        >
          {/* Background decoration */}
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-bl-[6rem] bg-gradient-to-bl from-primary/10 via-accent/5 to-transparent" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative max-w-2xl">
            <Badge className="mb-4 gap-1.5 rounded-full px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3" /> যোগাযোগ করুন
            </Badge>
            <h3 className="text-2xl font-bold leading-snug md:text-3xl">
              অ্যাকাউন্ট খুলতে বা নির্মাতার সাথে যোগাযোগ করুন
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              এই প্ল্যাটফর্মে সরাসরি সাইন-আপ চালু নেই। অ্যাকাউন্ট খুলতে চাইলে, অথবা এই সাইটটি কে তৈরি
              করেছেন জানতে চাইলে নিচের লিংকে যোগাযোগ করুন। বিস্তারিত তথ্য ও এক্সেস আপনাকে সরাসরি
              প্রদান করা হবে।
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 w-full gap-2 rounded-full px-7 font-semibold shadow-lg shadow-primary/20 sm:w-auto">
                <Link href={contactLink}>যোগাযোগ করুন <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 w-full rounded-full px-7 sm:w-auto">
                <Link href="/">আরও জানুন</Link>
              </Button>
            </div>
          </div>
        </motion.div>
          </Section>

          <Section className="pb-20">
            <SectionHeading
              kicker="FAQ"
              title="সাধারণ জিজ্ঞাসা"
              subtitle="AI exam platform, MCQ generation এবং analytics নিয়ে গুরুত্বপূর্ণ প্রশ্নের সংক্ষিপ্ত উত্তর।"
            />
            <div className="grid gap-3 md:grid-cols-2">
              {faqs.map((item, i) => (
                <motion.div
                  key={item.q}
                  initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp} custom={i % 3}
                  className="premium-panel rounded-2xl p-5"
                >
                  <h3 className="text-sm font-semibold leading-snug">{item.q}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.a}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <Section className="pb-20 pt-16">
          <div className="premium-panel rounded-3xl p-8">
            <div className="h-28 w-full animate-pulse rounded-2xl bg-muted/40" />
          </div>
        </Section>
      )}

    </main>
  );
}
