import { auth } from "./config";
import { redirect } from "next/navigation";

/**
 * Server-side helper: get the current session or redirect to /login.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

/**
 * Server-side helper: get the current session without redirect.
 * Returns null if not authenticated.
 */
export async function getOptionalAuth() {
  return auth();
}
