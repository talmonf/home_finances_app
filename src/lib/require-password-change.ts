import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

/** Sends a signed-in user to change their password before the rest of the app. */
export async function redirectIfPasswordChangeRequired() {
  const session = await getAuthSession();
  if (session?.user?.passwordActionRequired) {
    redirect("/change-password");
  }
}
