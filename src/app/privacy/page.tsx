import type { Metadata } from "next";
import Link from "next/link";
import {
  GOOGLE_ACCOUNT_PERMISSIONS_URL,
  GOOGLE_API_USER_DATA_POLICY_URL,
  getPrivacyContactEmail,
  privacyPolicyPageStrings,
  type PrivacyPolicySection,
} from "@/lib/privacy-policy-content";
import { uiLanguageDirection, type UiLanguage } from "@/lib/ui-language";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const copy = privacyPolicyPageStrings("en");
  return {
    title: copy.documentTitle,
    description: copy.metaDescription,
    robots: { index: true, follow: true },
  };
}

function PolicyBlock({
  lang,
  id,
}: {
  lang: UiLanguage;
  id: string;
}) {
  const copy = privacyPolicyPageStrings(lang);
  const dir = uiLanguageDirection(lang);
  const contactEmail = getPrivacyContactEmail();

  return (
    <article id={id} lang={lang} dir={dir} className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-300">{copy.kicker}</p>
        <h1 className="text-3xl font-semibold text-slate-50">{copy.title}</h1>
        <p className="text-sm text-slate-400">
          {copy.lastUpdatedLabel}: {copy.lastUpdatedDisplay}
        </p>
        <p>
          <a href={copy.otherLanguageHref} className="text-sm text-sky-300 hover:text-sky-200">
            {copy.jumpToOtherLanguage}
          </a>
        </p>
      </header>

      <p className="text-sm leading-relaxed text-slate-200">{copy.intro}</p>

      <p className="rounded-xl border border-sky-800/60 bg-sky-950/30 px-4 py-3 text-sm leading-relaxed text-slate-100">
        {copy.googleLimitedUse}{" "}
        <a
          href={GOOGLE_API_USER_DATA_POLICY_URL}
          className="text-sky-300 underline decoration-sky-700 underline-offset-2 hover:text-sky-200"
          rel="noreferrer"
          target="_blank"
        >
          {copy.googlePolicyLinkLabel}
        </a>
        .
      </p>

      {copy.sections.map((section) => (
        <PolicySection key={`${lang}-${section.id}`} section={section} />
      ))}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-50">{copy.contactHeading}</h2>
        {contactEmail ? (
          <p className="text-sm leading-relaxed text-slate-300">
            {copy.contactWithEmail}{" "}
            <a className="text-sky-300 hover:text-sky-200" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
            .
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-slate-300">{copy.contactWithoutEmail}</p>
        )}
        <p className="text-sm leading-relaxed text-slate-300">
          <a
            href={GOOGLE_ACCOUNT_PERMISSIONS_URL}
            className="text-sky-300 underline decoration-sky-700 underline-offset-2 hover:text-sky-200"
            rel="noreferrer"
            target="_blank"
          >
            {copy.revokeGoogleLabel}
          </a>
        </p>
      </section>
    </article>
  );
}

function PolicySection({ section }: { section: PrivacyPolicySection }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-50">{section.title}</h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-relaxed text-slate-300">
          {paragraph}
        </p>
      ))}
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-16 px-4 py-10">
      <PolicyBlock lang="en" id="privacy-en" />
      <hr className="border-slate-800" />
      <PolicyBlock lang="he" id="privacy-he" />
      <p className="text-center text-xs text-slate-500">
        <Link href="/login" className="text-sky-300 hover:text-sky-200">
          Sign in / התחברות
        </Link>
      </p>
    </div>
  );
}
