"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireHouseholdMember } from "@/lib/auth";
import { SESSION_OBFUSCATE_COOKIE } from "@/lib/session-obfuscate-cookie";

/** Persists demo obfuscation for this browser session only (no database). */
export async function setSessionObfuscate(enabled: boolean) {
  await requireHouseholdMember();
  const store = await cookies();
  if (enabled) {
    store.set(SESSION_OBFUSCATE_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
  } else {
    store.delete(SESSION_OBFUSCATE_COOKIE);
  }
  revalidatePath("/", "layout");
}
