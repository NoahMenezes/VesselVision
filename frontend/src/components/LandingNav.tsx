"use client";
/** Landing navbar: brand left, auth right. Degrades to setup guidance
 *  until Clerk keys exist (see src/lib/auth.ts).
 *
 *  NOTE (@clerk/nextjs v7): SignedIn/SignedOut control components were
 *  removed upstream and throw by design; conditional UI uses useAuth().
 */
import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { HeartPulse } from "lucide-react";
import { clerkConfigured } from "@/lib/auth";
import { Button } from "@/components/ui";

export function LandingNav() {
  const configured = clerkConfigured();
  const { isSignedIn } = useAuth();
  return (
    <header className="flex h-14 items-center justify-between border-b border-border-soft px-4 lg:px-6">
      <Link href="/" className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-accent" aria-hidden />
        <span className="text-[15px] font-bold tracking-tight">VesselVision</span>
        <span className="hidden text-xs text-muted sm:inline">Heart risk checker</span>
      </Link>
      <div className="flex items-center gap-2">
        {!configured ? (
          <span className="text-xs text-muted" title="Paste Clerk keys into frontend/.env.local to enable sign-in">
            Sign-in needs Clerk keys
          </span>
        ) : isSignedIn ? (
          <>
            <Link href="/console">
              <Button>Open console</Button>
            </Link>
            <UserButton />
          </>
        ) : (
          <SignInButton mode="modal" forceRedirectUrl="/console">
            <Button variant="ghost">Sign in</Button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
