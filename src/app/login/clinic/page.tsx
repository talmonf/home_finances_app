import { redirect } from "next/navigation";

type LoginClinicPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    passwordUpdated?: string;
    lang?: string;
  }>;
};

/** Legacy path — canonical clinic login is `/login`. */
export default async function LoginClinicPage({ searchParams }: LoginClinicPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const qs = new URLSearchParams();
  if (resolvedSearchParams?.callbackUrl) {
    qs.set("callbackUrl", resolvedSearchParams.callbackUrl);
  }
  if (resolvedSearchParams?.passwordUpdated === "1") {
    qs.set("passwordUpdated", "1");
  }
  const lang = resolvedSearchParams?.lang?.trim();
  if (lang === "en" || lang === "he") {
    qs.set("lang", lang);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/login${suffix}`);
}
