"use client";
/** Landing navbar: brand left, auth right. Degrades to setup guidance
 *  until Clerk keys exist (see src/lib/auth.ts).
 */
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { HeartPulse } from "lucide-react";
import { clerkConfigured } from "@/lib/auth";
import { Button } from "@/components/ui";

export function LandingNav() {
  const configured = clerkConfigured();
  return (
    <header className="flex h-14 items-center justify-between border-b border-border-soft px-4 lg:px-6">
      <Link href="/" className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-accent" aria-hidden />
        <span className="text-[15px] font-bold tracking-tight">VesselVision</span>
        <span className="hidden text-xs text-muted sm:inline">Track A · CAD risk</span>
      </Link>
      <div className="flex items-center gap-2">
        {configured ? (
          <>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost">Sign in</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/console">
                <Button>Open console</Button>
              </Link>
              <UserButton />
            </SignedIn>
          </>
        ) : (
          <span className="text-xs text-muted" title="Paste Clerk keys into frontend/.env.local to enable sign-in">
            Sign-in needs Clerk keys
          </span>
        )}
      </div>
    </header>
  );
}
