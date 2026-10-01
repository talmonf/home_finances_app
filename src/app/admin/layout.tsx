import { redirectIfPasswordChangeRequired } from "@/lib/require-password-change";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await redirectIfPasswordChangeRequired();
  return children;
}
