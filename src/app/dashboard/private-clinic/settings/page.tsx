import { redirect } from "next/navigation";

/** Private clinic configuration is managed by a super admin (Edit household). */
export default function PrivateClinicSettingsRedirectPage() {
  redirect("/dashboard/private-clinic");
}
