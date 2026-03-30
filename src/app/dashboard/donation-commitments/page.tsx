import { redirect } from "next/navigation";

/** Legacy URL: donation tracking now lives under /dashboard/donations */
export default function DonationCommitmentsRedirectPage() {
  redirect("/dashboard/donations");
}
