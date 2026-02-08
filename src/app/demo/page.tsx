
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";

export default function DemoOne() {
    return (
        <div className="relative min-h-screen">

            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
                <div
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none absolute -top-10 left-1/2 size-full -translate-x-1/2 rounded-full',
                        'bg-[radial-gradient(ellipse_at_center,--alpha(var(--color-primary)/.1),transparent_50%)]',
                        'blur-[30px]',
                    )}
                />
                <h1 className="font-serif text-6xl md:text-8xl font-bold tracking-tight text-center mb-8" style={{ fontFamily: 'var(--font-shippori)' }}>
                    Dotted Surface
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl text-center mb-12">
                    A beautiful, interactive particle animation built with Three.js and React.
                </p>
                <div className="flex gap-4">
                    <Button size="lg" className="rounded-full">Get Started</Button>
                    <Button size="lg" variant="outline" className="rounded-full">Learn More</Button>
                </div>
            </div>
        </div>
    );
}
