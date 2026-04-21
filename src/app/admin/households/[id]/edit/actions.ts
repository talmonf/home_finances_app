"use server";

import { getAuthSession, prisma } from "@/lib/auth";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { normalizeHouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { upsertHouseholdEnabledSections } from "@/lib/household-sections";
import { PRIVATE_CLINIC_NAV_ITEMS } from "@/lib/private-clinic-nav";
import { ensureTherapySettings } from "@/lib/therapy/bootstrap";
import type { TherapyHebrewTranscriptionProvider } from "@/generated/prisma/enums";
import { HOME_FREQUENT_LINK_KEYS, type HomeFrequentLinkKey } from "@/lib/home-frequent-links";
import { normalizeUiLanguage } from "@/lib/ui-language";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseHebrewTranscriptionProvider(
  raw: string | null | undefined,
): TherapyHebrewTranscriptionProvider {
  const v = raw?.trim();
  if (v === "aws") return "aws";
  return "openrouter";
}

export async function saveHouseholdSettings(formData: FormData) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }

  const householdId = (formData.get("household_id") as string | null)?.trim();
  if (!householdId) {
    redirect("/admin/households?error=" + encodeURIComponent("Missing household."));
  }

  const raw = (formData.get("date_display_format") as string | null)?.trim();
  const date_display_format = normalizeHouseholdDateDisplayFormat(raw);
  const ui_language = normalizeUiLanguage((formData.get("ui_language") as string | null)?.trim());
  const show_entity_url_panels = formData.get("show_entity_url_panels") === "on";

  const updateHomeFrequentLinks = formData.get("home_frequent_links_form") === "1";
  const home_frequent_links_json = {} as Record<HomeFrequentLinkKey, boolean>;
  if (updateHomeFrequentLinks) {
    for (const key of HOME_FREQUENT_LINK_KEYS) {
      home_frequent_links_json[key] = formData.get(`hf_${key}`) === "on";
    }
  }

  await prisma.households.update({
    where: { id: householdId },
    data: {
      date_display_format,
      ui_language,
      show_entity_url_panels,
      ...(updateHomeFrequentLinks ? { home_frequent_links_json } : {}),
    },
  });

  const enabledBySectionId: Record<string, boolean> = {};
  for (const section of DASHBOARD_SECTIONS) {
    enabledBySectionId[section.id] =
      formData.get(`section_${section.id}`) === "on";
  }

  await upsertHouseholdEnabledSections({ householdId, enabledBySectionId });

  await ensureTherapySettings(householdId);
  const navTabs: Record<string, boolean> = {};
  for (const item of PRIVATE_CLINIC_NAV_ITEMS) {
    navTabs[item.key] = formData.get(`pc_nav_${item.key}`) === "on";
  }
  const note_1_label = (formData.get("note_1_label") as string | null)?.trim() || "Note 1";
  const note_2_label = (formData.get("note_2_label") as string | null)?.trim() || "Note 2";
  const note_3_label = (formData.get("note_3_label") as string | null)?.trim() || "Note 3";
  const trimHe = (k: string) => {
    const t = (formData.get(k) as string | null)?.trim();
    return t ? t : null;
  };
  const note_1_label_he = trimHe("note_1_label_he");
  const note_2_label_he = trimHe("note_2_label_he");
  const note_3_label_he = trimHe("note_3_label_he");
  const hebrew_transcription_provider = parseHebrewTranscriptionProvider(
    formData.get("hebrew_transcription_provider") as string | null,
  );
  const family_therapy_enabled = formData.get("family_therapy_enabled") === "on";
  if (!family_therapy_enabled) {
    navTabs.families = false;
  }
  await prisma.therapy_settings.update({
    where: { household_id: householdId },
    data: {
      nav_tabs_json: navTabs,
      note_1_label,
      note_2_label,
      note_3_label,
      note_1_label_he,
      note_2_label_he,
      note_3_label_he,
      hebrew_transcription_provider,
      family_therapy_enabled,
    },
  });

  revalidatePath("/admin/households");
  revalidatePath(`/admin/households/${householdId}/edit`);
  revalidatePath("/");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/private-clinic", "layout");

  redirect(`/admin/households/${householdId}/edit?saved=1`);
}
