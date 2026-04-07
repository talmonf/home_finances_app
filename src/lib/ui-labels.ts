import type { UiLanguage } from "@/lib/ui-language";
import type {
  MedicalAppointmentPaymentMethod,
  MedicalReimbursementSource,
  TherapyVisitType,
} from "@/generated/prisma/enums";

export function medicalPaymentLabel(
  language: UiLanguage,
  value: MedicalAppointmentPaymentMethod,
): string {
  const labels: Record<MedicalAppointmentPaymentMethod, string> =
    language === "he"
      ? {
          cash: "מזומן",
          credit_card: "כרטיס אשראי",
          bank_account: "חשבון בנק / העברה",
          digital_wallet: "ארנק דיגיטלי",
          kupat_holim_benefit: "קופת חולים (מכוסה / ללא השתתפות עצמית)",
          other: "אחר",
        }
      : {
          cash: "Cash",
          credit_card: "Credit card",
          bank_account: "Bank account / transfer",
          digital_wallet: "Digital wallet",
          kupat_holim_benefit: "Kupat holim (covered / no out-of-pocket)",
          other: "Other",
        };
  return labels[value];
}

export function reimbursementSourceLabel(
  language: UiLanguage,
  value: MedicalReimbursementSource,
): string {
  const labels: Record<MedicalReimbursementSource, string> =
    language === "he"
      ? {
          kupat_holim: "קופת חולים",
          private_insurance: "ביטוח פרטי",
        }
      : {
          kupat_holim: "Kupat holim",
          private_insurance: "Private insurance",
        };
  return labels[value];
}

export function therapyVisitTypeLabel(language: UiLanguage, value: TherapyVisitType): string {
  const labels: Record<TherapyVisitType, string> =
    language === "he"
      ? {
          clinic: "קליניקה",
          home: "בית",
          phone: "טלפון",
          video: "וידאו",
        }
      : {
          clinic: "Clinic",
          home: "Home",
          phone: "Phone",
          video: "Video",
        };
  return labels[value];
}
