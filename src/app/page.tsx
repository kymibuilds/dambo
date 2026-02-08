import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggleButton1 } from "@/components/ui/theme-toggle-buttons";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ArrowDown } from "lucide-react";
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerPlayButton,
  VideoPlayerTimeRange,
  VideoPlayerTimeDisplay,
  VideoPlayerMuteButton,
  VideoPlayerVolumeRange,
} from "@/components/ui/video-player";

export default function Home() {
  return (
    <div className="min-h-screen relative bg-background overflow-x-hidden">
      {/* Horizontal Separator Border - stretched across the page */}
      <div className="absolute top-14 md:top-16 left-0 right-0 h-3 md:h-4 border-y border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0"></div>

      {/* Main Container 1 (Hero) */}
      <div className="w-[85%] md:w-[70%] min-h-[90vh] mx-auto relative flex flex-col">
        {/* Left Border */}
        <div className="absolute left-0 top-0 bottom-0 w-3 md:w-4 border-x border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0"></div>
        {/* Right Border */}
        <div className="absolute right-0 top-0 bottom-0 w-3 md:w-4 border-x border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0"></div>

        {/* Top Intersection Squares */}
        <div className="absolute top-14 md:top-16 left-0 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-10"></div>
        <div className="absolute top-14 md:top-16 right-0 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-10"></div>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col relative z-20">
          <header className="flex justify-between items-center h-14 md:h-16 px-4 md:px-8">
            <span
              className="text-xl md:text-2xl font-extralight tracking-tighter"
              style={{ fontFamily: 'var(--font-exo2)' }}
            >
              dambo.
            </span>
            <ThemeToggleButton1 className="size-6" />
          </header>

          <main className="flex-1 flex flex-col items-center justify-center text-center gap-10 pt-12 pb-14 md:pb-16 px-4 md:px-8">
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

            <p className="max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
              Load your datasets, interactively analyze them, tweak filters, and play around with every dimension. When you’re ready, export the polished charts as downloadable reports for your team.
            </p>
            {/* Action Button - Standard Button with 0 rounded corners */}
            <div className="pt-8 flex flex-col items-center">
              <Link href="/dashboard">
                <Button
                  className="rounded-none h-7 px-6 text-xs font-bold tracking-[0.2em] gap-2 bg-zinc-600 hover:bg-zinc-700 text-white"
                  style={{ fontFamily: 'var(--font-exo2)' }}
                >
                  DASHBOARD
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </main>

          {/* Scroll Prompt */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce cursor-default select-none opacity-50 hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground">SCROLL</span>
            <ArrowDown className="size-3 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Middle Full-Width Separator */}
      <div className="relative h-3 md:h-4 w-full border-y border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0">
        <div className="w-[85%] md:w-[70%] mx-auto h-full relative">
          {/* Intersection Squares for Middle Separator */}
          <div className="absolute top-[-1px] left-0 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-10"></div>
          <div className="absolute top-[-1px] right-0 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-10"></div>
        </div>
      </div>

      {/* Main Container 2a (Video) */}
      <div className="w-[85%] md:w-[70%] mx-auto relative flex flex-col">
        {/* Left Border */}
        <div className="absolute left-0 top-0 bottom-0 w-3 md:w-4 border-x border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0"></div>
        {/* Right Border */}
        <div className="absolute right-0 top-0 bottom-0 w-3 md:w-4 border-x border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0"></div>

        {/* Video Player Section - Margins matching border widths */}
        <section className="w-auto mx-3 md:mx-4 relative z-20">
          <div className="w-full aspect-video">
            <VideoPlayer className="w-full h-full rounded-none">
              <VideoPlayerContent
                slot="media"
                src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                poster="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg"
                className="w-full h-full object-cover rounded-none"
                playsInline
                crossOrigin="anonymous"
              />
              <VideoPlayerControlBar>
                <VideoPlayerPlayButton />
                <VideoPlayerTimeRange />
                <VideoPlayerTimeDisplay showDuration />
                <VideoPlayerMuteButton />
                <VideoPlayerVolumeRange />
              </VideoPlayerControlBar>
            </VideoPlayer>
          </div>
        </section>
      </div>

      {/* Full Width Separator 1 */}
      <div className="relative h-3 md:h-4 w-full border-y border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0">
        <div className="w-[85%] md:w-[70%] mx-auto h-full relative">
          <div className="absolute top-[-1px] left-0 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-10"></div>
          <div className="absolute top-[-1px] right-0 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-10"></div>
        </div>
      </div>

      {/* Main Container 2b (Screenshots) */}
      <div className="w-[85%] md:w-[70%] mx-auto relative flex flex-col">
        {/* Left Border */}
        <div className="absolute left-0 top-0 bottom-0 w-3 md:w-4 border-x border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0"></div>
        {/* Right Border */}
        <div className="absolute right-0 top-0 bottom-0 w-3 md:w-4 border-x border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0"></div>

        <section className="w-auto mx-3 md:mx-4 relative z-20 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)]">
          {/* Intersection Squares */}
          <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-30"></div>
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-30"></div>
          <div className="hidden md:block absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-30"></div>
          <div className="hidden md:block absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-30"></div>
          <div className="hidden md:block absolute top-1/2 right-0 translate-x-full -translate-y-1/2 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-30"></div>

          {/* Screenshot 1 */}
          <div className="aspect-video bg-secondary relative overflow-hidden"></div>

          {/* Screenshot 2 */}
          <div className="aspect-video bg-secondary relative overflow-hidden"></div>

          {/* Screenshot 3 */}
          <div className="aspect-video bg-secondary relative overflow-hidden"></div>

          {/* Screenshot 4 */}
          <div className="aspect-video bg-secondary relative overflow-hidden"></div>
        </section>
      </div>

      {/* Full Width Separator 2 */}
      <div className="relative h-3 md:h-4 w-full border-y border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0">
        <div className="w-[85%] md:w-[70%] mx-auto h-full relative">
          <div className="absolute top-[-1px] left-0 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-10"></div>
          <div className="absolute top-[-1px] right-0 w-3 md:w-4 h-3 md:h-4 bg-background border border-border z-10"></div>
        </div>
      </div>

      {/* Main Container 2c (Features Content) */}
      <div className="w-[85%] md:w-[70%] mx-auto relative flex flex-col pb-20">
        {/* Left Border */}
        <div className="absolute left-0 top-0 bottom-0 w-3 md:w-4 border-x border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0"></div>
        {/* Right Border */}
        <div className="absolute right-0 top-0 bottom-0 w-3 md:w-4 border-x border-border bg-[image:repeating-linear-gradient(45deg,var(--border)_0,var(--border)_1px,transparent_0,transparent_3px)] z-0"></div>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col relative z-20 px-4 md:px-8 py-12 gap-20">

          {/* Features Section */}
          <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              {
                title: "Real-time Analytics",
                description: "Process and visualize data streams instantly as they arrive in your system."
              },
              {
                title: "Interactive Charts",
                description: "Drill down into specifics with highly responsive and customizable visualization tools."
              },
              {
                title: "Team Collaboration",
                description: "Share insights and export reports seamlessly with your entire organization."
              }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col gap-4 p-6 border border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-colors group/card">
                <div className="size-10 rounded bg-foreground/5 flex items-center justify-center border border-border/20 group-hover/card:bg-foreground/10 transition-colors">
                  <span className="font-mono text-lg font-bold">{i + 1}</span>
                </div>
                <h3 className="text-xl font-medium" style={{ fontFamily: 'var(--font-exo2)' }}>{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
