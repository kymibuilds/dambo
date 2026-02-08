import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { ThemeToggleButton1 } from "@/components/ui/theme-toggle-buttons";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 text-foreground overflow-x-hidden">
      <DottedSurface />

      {/* Absolute Header Elements */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-50">
        <span className="text-xl md:text-2xl font-serif font-bold tracking-tight" style={{ fontFamily: 'var(--font-shippori)' }}>
          dambo
        </span>
      </div>
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-50">
        <ThemeToggleButton1 className="size-7" />
      </div>

      {/* Main Content strictly centered along a vertical axis */}
      <main className="flex flex-col items-center justify-center gap-10 text-center w-full max-w-5xl mx-auto relative z-10 py-20">



        {/* Headline Group */}
        <div className="flex flex-col items-center gap-6 w-full">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif tracking-tight leading-[1.1] text-center w-full" style={{ fontFamily: 'var(--font-shippori)' }}>
            <span className="block">visualize your data</span>
            <span className="flex flex-wrap items-center justify-center gap-0 md:gap-1">
              <span>in real time.</span>
              <Image
                src="/mascot_v3.png"
                alt="Dambo Mascot"
                width={120}
                height={120}
                className="animate-bounce-subtle inline-block w-16 h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 object-contain mix-blend-multiply dark:mix-blend-normal dark:invert-[0.05] translate-y-2"
                priority
              />
            </span>
          </h1>

          {/* Badge Group */}
          <div className="flex items-center justify-center">
            <a
              href="https://tambo.co"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50 border border-border/40 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:border-border hover:text-foreground shadow-sm"
            >
              <span>powered by</span>
              <span className="underline underline-offset-4 decoration-border/80 group-hover:decoration-foreground/50 transition-colors">tambo.co</span>
            </a>
          </div>
        </div>

        {/* Description */}
        <p className="max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
          Load your datasets, interactively analyze them, tweak filters, and play around with every dimension. When you’re ready, export the polished charts as downloadable reports for your team.
        </p>

        {/* Action Button */}
        <div className="pt-4 flex flex-col items-center">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="rounded-2xl px-6 text-base h-12 font-medium flex items-center gap-2 font-serif group"
              style={{ fontFamily: 'var(--font-shippori)' }}
            >
              Dashboard
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
