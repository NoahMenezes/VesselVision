import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth";
import { Disclaimer } from "@/components/Disclaimer";
import { HeroHeart } from "@/components/HeroHeart";
import { LandingNav } from "@/components/LandingNav";
import { Button } from "@/components/ui";

const STEPS = [
  { title: "Enter data", text: "54 clinical fields, example patients, or a CSV upload." },
  { title: "Explore heart", text: "Each artery recolors by predicted stenosis risk." },
  { title: "Review risk", text: "Plain-word reasons for every result, ready to print." },
] as const;

const STATS: [string, string][] = [
  ["303", "patients studied"],
  ["54", "clinical fields"],
  ["4", "targets: CAD, LAD, LCX, RCA"],
];

function StartButton() {
  const configured = clerkConfigured();
  if (!configured) {
    return (
      <span className="flex flex-col gap-1">
        <Button>Open console</Button>
        <span className="text-[11px] text-muted">Auth activates after Clerk keys are added.</span>
      </span>
    );
  }
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button>Sign in to start</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link href="/console">
          <Button>Open console</Button>
        </Link>
      </SignedIn>
    </>
  );
}

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingNav />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 lg:px-6">
        <section aria-label="Introduction" className="grid items-center gap-8 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
              Track A · Cardiovascular risk
            </p>
            <h1 className="mt-2 max-w-xl text-4xl font-bold leading-tight lg:text-5xl">
              Angiography answers CAD late and invasively. Routine workup already holds the signal.
            </h1>
            <p className="tnum mt-3 max-w-xl text-base text-muted">
              VesselVision turns 54 clinical fields into per-artery stenosis risk you can see,
              with plain-word reasons for every result.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <StartButton />
              <a href="https://github.com/NoahMenezes/VesselVision/blob/main/docs/VesselVision_Documentation.md" target="_blank" rel="noreferrer">
                <Button variant="ghost">Read the full story</Button>
              </a>
            </div>
            <dl className="tnum mt-6 flex gap-6">
              {STATS.map(([v, k]) => (
                <div key={k}>
                  <dt className="sr-only">{k}</dt>
                  <dd className="text-2xl font-bold">{v}</dd>
                  <dd className="text-xs text-muted">{k}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroHeart />
        </section>
        <section aria-label="How it works" className="grid gap-3 border-t border-border-soft py-8 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-lg border border-border-soft bg-surface p-5">
              <p className="tnum text-xs font-semibold text-accent">0{i + 1}</p>
              <h2 className="mt-1 font-bold">{s.title}</h2>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </section>
      </main>
      <Disclaimer />
      <footer className="border-t border-border-soft px-4 py-4 text-center text-[11px] text-muted lg:px-6">
        Decision support and education only. Data: UCI-411 CC-BY. Heart model: Sketchfab, license TBD.
      </footer>
    </div>
  );
}
