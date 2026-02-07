import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white text-black p-4">
      <main className="flex flex-col items-center justify-center gap-8 text-center max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-serif tracking-tight leading-tight" style={{ fontFamily: 'var(--font-shippori)' }}>
          visualize your data real time.
        </h1>
        <Button size="lg" className="rounded-full px-8 text-lg h-12">
          Upload
        </Button>
      </main>
    </div>
  );
}
