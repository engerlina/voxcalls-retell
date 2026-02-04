import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/android-chrome-192x192.png"
              alt="VoxCalls"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-foreground">VoxCalls</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          Voice AI for
          <span className="text-primary"> Everyone</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground">
          Build intelligent voice agents that can handle calls, answer questions,
          and engage with your customers 24/7. Powered by cutting-edge AI.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="text-lg">
              Start Free Trial
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="text-lg">
              Learn More
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
          Everything You Need
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard
            title="Intelligent Agents"
            description="Create custom AI agents with unique personalities and knowledge bases tailored to your business."
          />
          <FeatureCard
            title="Phone Integration"
            description="Connect phone numbers to your agents for seamless inbound and outbound calling."
          />
          <FeatureCard
            title="Real-time Analytics"
            description="Monitor conversations, track performance, and gain insights from every interaction."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/android-chrome-192x192.png"
                alt="VoxCalls"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="font-semibold text-foreground">VoxCalls</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              &copy; 2024 VoxCalls. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 h-12 w-12 rounded-lg bg-primary/10" />
      <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
