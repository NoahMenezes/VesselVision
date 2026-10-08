/** Clerk presence check. Until real keys are pasted into .env.local,
 *  auth UI degrades to guidance instead of throwing (dev-friendly;
 *  production must set both keys).
 */
export const CLERK_PLACEHOLDER = "pk_test_placeholder";

export function clerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return key !== "" && !key.includes("placeholder");
}
