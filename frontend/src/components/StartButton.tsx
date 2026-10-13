"use client";
/** Landing call-to-action: sign-in when logged out, console link when in.
 *  Client-only (useAuth); degraded guidance until Clerk keys exist.
 */
import Link from "next/link";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth";
import { Button } from "@/components/ui";

export function StartButton() {
  const configured = clerkConfigured();
  const { isSignedIn } = useAuth();
  if (!configured) {
    return (
      <span className="flex flex-col gap-1">
        <Button>Open console</Button>
        <span className="text-[11px] text-muted">Sign-in unlocks after setup.</span>
      </span>
    );
  }
  if (!isSignedIn) {
    return (
      <SignInButton mode="modal" forceRedirectUrl="/console">
        <Button>Sign in to start</Button>
      </SignInButton>
    );
  }
  return (
    <Link href="/console">
      <Button>Open console</Button>
    </Link>
  );
}
