import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isConsoleRoute = createRouteMatcher(["/console(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Local dev without keys: let everything through (landing documents setup).
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.next();
  if (isConsoleRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
