"use client";
/** Signed-in visits land straight in the console: no extra click. Rendered
 *  on the landing page only; /console never redirects back, so no loop.
 */
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { clerkConfigured } from "@/lib/auth";

export function AutoConsole() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (clerkConfigured() && isLoaded && isSignedIn) router.replace("/console");
  }, [isLoaded, isSignedIn, router]);
  return null;
}
