export type RiseUpImportGuideSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type RiseUpImportGuideContent = {
  modalTitle: string;
  openButton: string;
  closeButton: string;
  sections: RiseUpImportGuideSection[];
  tooltips: Record<string, string>;
  guideFooterHint: string;
};

const englishSections: RiseUpImportGuideSection[] = [
  {
    id: "overview",
    title: "What this screen does",
    paragraphs: [
      "Import a RiseUp CSV export, review how each row matches your existing accounts, payees, categories, and entities, then save in controlled batches.",
      "You do not need to finish thousands of rows in one sitting. Work tab by tab, month by month, and return later — your draft is saved automatically.",
    ],
  },
  {
    id: "start",
    title: "Getting started",
    paragraphs: ["Upload the same CSV file each time you continue an import session."],
    bullets: [
      "Choose your RiseUp CSV file and click Analyze file.",
      "If a saved draft exists, re-upload the same file — your previous row actions and proposal decisions are restored when the file hash matches.",
      "Use Start over or Discard saved draft only when you want a clean slate.",
    ],
  },
  {
    id: "tabs",
    title: "Wizard tabs (work in this order)",
    bullets: [
      "Instruments — approve new bank accounts and credit cards detected in the export.",
      "Core mappings — review payee and category suggestions.",
      "Domain entities — subscriptions, utilities, insurance, donations, and similar entities.",
      "Transactions — decide Create / Skip / Update per row (work in monthly chunks here).",
      "Backfill — link already-imported transactions to entities when historical link proposals exist.",
    ],
  },
  {
    id: "counts",
    title: "Understanding the counts",
    bullets: [
      "Rows — total lines in the CSV after analysis.",
      "Need review — uncertain matches (payee, card/account, zero amount, etc.); shown in amber.",
      "New — not in the app yet. Existing — already imported (skipped by default on re-import). Changed — same row, different content. Ambiguous — duplicate identity; needs manual decision.",
      "Proposals — staged suggestions waiting for Approve / Reject in the entity tabs.",
      "Patterns — recurring behavior detected across the file (cards, petrol, subscriptions, etc.).",
      "Summary bar — preview of what will happen when you click Save: how many Create, Update, and Skip.",
      "Click Needs review, Proposals, or Patterns stat cards to jump to the relevant view.",
    ],
  },
  {
    id: "chunks",
    title: "Working in chunks (Transactions tab)",
    paragraphs: [
      "New rows default to Skip so nothing is imported until you choose. Use filters and bulk actions to queue one batch at a time.",
    ],
    bullets: [
      "Opening Transactions selects the latest payment month automatically.",
      "Filter by month, import status, or Needs review only.",
      "Skip all existing — skip every row already in the database.",
      "Skip all visible — skip only rows matching the current filter.",
      "Create high-confidence new (visible) — mark filtered new rows with strong matches as Create.",
      "The table shows 100 rows per page — use Previous / Next to navigate.",
      "Only rows marked Create or Update are written when you save.",
    ],
  },
  {
    id: "save",
    title: "Save and continue",
    paragraphs: [
      "The green button saves all rows marked Create/Update across the entire file, plus any proposals you approved in other tabs.",
      "After a partial save, committed rows become Existing and the wizard stays open if work remains.",
      "When every row is imported and proposals are handled, the session closes and the draft is cleared.",
    ],
  },
  {
    id: "draft",
    title: "Draft persistence",
    bullets: [
      "Row actions, overrides, proposal decisions, filters, and active tab are autosaved every few seconds.",
      "Draft saved appears when the server has your session.",
      "Closing the browser is fine — re-upload the same CSV and Analyze to resume.",
    ],
  },
  {
    id: "workflow",
    title: "Recommended multi-session workflow",
    bullets: [
      "Session 1: Instruments → Core mappings → Domain entities. Save with all transactions still on Skip to create entities only.",
      "Session 2+: Transactions — pick one month, bulk-create high-confidence rows, Save N transactions and continue.",
      "Repeat monthly until New reaches zero.",
      "Prioritize amber need-review rows before trusting bulk create.",
    ],
  },
];

const hebrewSections: RiseUpImportGuideSection[] = [
  {
    id: "overview",
    title: "מה המסך הזה עושה",
    paragraphs: [
      "ייבוא קובץ CSV מ-RiseUp, בדיקת התאמה לחשבונות, משלמים, קטגוריות וישויות קיימות, ושמירה בקבוצות מבוקרות.",
      "אין צורך לסיים אלפי שורות בישיבה אחת. עבדו לפי לשונית, לפי חודש, וחזרו מאוחר יותר — הטיוטה נשמרת אוטומטית.",
    ],
  },
  {
    id: "start",
    title: "התחלה",
    paragraphs: ["העלו את אותו קובץ CSV בכל המשך של ייבוא."],
    bullets: [
      "בחרו קובץ RiseUp CSV ולחצו נתח קובץ.",
      "אם יש טיוטה שמורה — העלו שוב את אותו קובץ; החלטות קודמות יוחזרו כש-hash הקובץ תואם.",
      "השתמשו ב«התחל מחדש» או «מחק טיוטה» רק לסессיה נקייה.",
    ],
  },
  {
    id: "tabs",
    title: "לשוניות האשף (סדר עבודה מומלץ)",
    bullets: [
      "אמצעי תשלום — אישור חשבונות בנק וכרטיסי אשראי חדשים.",
      "התאמות בסיסיות — משלמים וקטגוריות.",
      "ישויות — מנויים, utilities, ביטוח, תרומות וכד'.",
      "תנועות — Create / Skip / Update לכל שורה (עבודה לפי חודש).",
      "קישור היסטורי — קישור תנועות שכבר יובאו לישויות, כשיש הצעות.",
    ],
  },
  {
    id: "counts",
    title: "הבנת המספרים",
    bullets: [
      "שורות — סך השורות בקובץ לאחר ניתוח.",
      "דורשות בדיקה — התאמות לא בטוחות; מסומן בצהוב.",
      "חדשות / קיימות / שונו / לא חד משמעיות — סטטוס ייבוא לכל שורה.",
      "הצעות — הצעות לאישור/דחייה בלשוניות הישויות.",
      "דפוסים — התנהגות חוזרת (כרטיסים, דלק, מנויים).",
      "סרגל הסיכום — תצוגה מקדימה של יצירה/עדכון/דילוג בעת שמירה.",
      "לחצו על «דורשות בדיקה», «הצעות» או «דפוסים» לקפיצה לתצוגה הרלוונטית.",
    ],
  },
  {
    id: "chunks",
    title: "עבודה בקבוצות (לשונית תנועות)",
    paragraphs: [
      "שורות חדשות מדולגות כברירת מחדל. סננו והשתמשו בפעולות מרובות כדי לייבא קבוצה אחת בכל פעם.",
    ],
    bullets: [
      "פתיחת «תנועות» בוחרת אוטומטית את חודש התשלום האחרון.",
      "סינון לפי חודש, סטטוס, או «רק שורות לבדיקה».",
      "דלג על כל הקיימות / דלג על המסוננות / צור חדשות בטוחות (מסוננות).",
      "100 שורות בעמוד — ניווט עם הקודם / הבא.",
      "רק שורות Create או Update נשמרות.",
    ],
  },
  {
    id: "save",
    title: "שמירה והמשך",
    paragraphs: [
      "הכפתור הירוק שומר את כל השורות עם Create/Update בקובץ, וגם הצעות שאושרו.",
      "לאחר שמירה חלקית השורות שנשמרו הופכות ל«קיימות» והאשף נשאר פתוח אם נשאר עבודה.",
      "כשהכל יובא — הסессיה נסגרת והטיוטה נמחקת.",
    ],
  },
  {
    id: "draft",
    title: "שמירת טיוטה",
    bullets: [
      "פעולות, התאמות, הצעות, מסננים ולשונית פעילה — נשמרים אוטומטית.",
      "«טיוטה נשמרה» מופיע כשהשרת קיבל את הסессיה.",
      "סגירת הדפדפן בטוחה — העלו שוב את אותו CSV ו«נתח קובץ».",
    ],
  },
  {
    id: "workflow",
    title: "זרימת עבודה מומלצת",
    bullets: [
      "סессיה 1: אמצעי תשלום → התאמות → ישויות. שמרו עם כל התנועות על Skip.",
      "סессיות 2+: תנועות — חודש אחד, צור חדשות בטוחות, שמור N תנועות והמשך.",
      "חזרו על כל חודש עד שלא נשארות שורות חדשות.",
      "העדיפו שורות «דורשות בדיקה» לפני יצירה מרובה.",
    ],
  },
];

const englishTooltips: Record<string, string> = {
  headerTitle: "RiseUp CSV import wizard — analyze, review matches, save in batches.",
  headerSubtitle: "Export from RiseUp as CSV, upload here, review, then confirm before writing to your ledger.",
  userGuideButton: "Open the full user guide with workflow steps and explanations.",
  checkResetImpact: "Preview how many RiseUp transactions, links, and proposals would be affected by a full reset (informational only).",
  resetPreviewPanel: "Results of the reset impact check — counts of transactions, enriched rows, entity links, and downstream dependencies.",
  savedDraftBanner: "A previous import session was saved. Re-upload the same CSV and Analyze to restore your decisions.",
  discardDraft: "Delete the saved draft from the server. Does not delete imported transactions.",
  csvFileInput: "Select your RiseUp CSV export file (same file each time you resume a session).",
  analyzeFileButton: "Parse the CSV, match rows to existing data, detect patterns, and stage entity proposals.",
  fileRowSummary: "Imported file name and total row count after analysis.",
  needReviewBadge: "Rows with uncertain matches — wrong payee, unclear card/account, zero amount, etc. Review before bulk create.",
  mostlyConfidentBadge: "Most rows have strong automatic matches.",
  importStatusCounts: "New = not imported yet. Existing = already in app. Changed = content differs. Ambiguous = duplicate identity conflict.",
  draftSavedIndicator: "Your review choices were autosaved to the server.",
  draftSaveFailed: "Autosave failed — check connection; changes may be lost if you close the page.",
  draftSaving: "Autosaving your session…",
  startOver: "Clear the current session and delete the saved draft. Does not remove transactions already committed.",
  importSummaryBar: "Preview of the next save: how many rows are marked Create, Update, or Skip. New rows default to Skip until you mark them.",
  wizardTabInstruments: "Approve new bank accounts and credit cards found in the export.",
  wizardTabCoreMappings: "Review payee and category mapping proposals.",
  wizardTabDomainEntities: "Subscriptions, utilities, insurance, donations, and other entity proposals.",
  wizardTabTransactions: "Per-row import actions. Filter by month and work in pages of 100 rows.",
  wizardTabBackfill: "Link already-imported transactions to entities when historical proposals exist.",
  statNeedsReview: "Rows flagged for manual review due to uncertain matching. Click to open Transactions filtered to needs review only.",
  statProposals: "Total staged entity proposals across all tabs. Click to open the wizard tab with the most proposals.",
  statPatterns: "Recurring patterns detected in the export (instruments, bills, subscriptions, etc.). Click to scroll to the pattern list.",
  statLegacyScanned: "Older RiseUp transactions checked for missing import keys.",
  statLegacyBackfilled: "Legacy transactions updated with import identity keys.",
  strongPatternsPanel: "High-confidence recurring patterns — each line shows type, duration, and average amount.",
  proposalsSection: "Staged proposals for the active wizard step. Approve, reject, or skip for now.",
  proposalActionSelect: "Approve creates the entity on save. Reject dismisses. Skip for now leaves it for a later session.",
  workExpenseCheckbox: "Link an approved subscription to a family member and job for work expense tracking.",
  filterPaymentMonth: "Show only transactions paid in this month. Opening Transactions picks the latest month automatically.",
  filterImportStatus: "Filter by import status: new, existing, changed, or ambiguous.",
  filterNeedsReviewOnly: "Show only rows flagged as needing manual review.",
  bulkSkipExisting: "Set Skip on every row already in the database (Existing status).",
  bulkSkipVisible: "Set Skip on all rows matching the current filters (before pagination).",
  bulkCreateHighConfidence: "Set Create on filtered new rows with strong matches and no review flags.",
  txFilterSummary: "Row counts: current page, filtered total, marked for import in view, and marked for import in entire file.",
  txPagination: "Navigate pages of 100 rows. Filters apply to the full filtered set.",
  txTable: "One row per RiseUp transaction. Amber = needs review. Dim = existing. Change Create/Skip/Update and mapping columns.",
  saveButton: "Write all rows marked Create/Update (entire file, not just this page) and apply approved proposals. Session continues if work remains.",
};

const hebrewTooltips: Record<string, string> = {
  headerTitle: "אשף ייבוא CSV מ-RiseUp — ניתוח, בדיקת התאמות, שמירה בקבוצות.",
  headerSubtitle: "ייצוא מ-RiseUp כ-CSV, העלאה, בדיקה, ואישור לפני כתיבה לספרים.",
  userGuideButton: "פתיחת מדריך מלא עם שלבי עבודה והסברים.",
  checkResetImpact: "תצוגה מקדימה של השפעת איפוס RiseUp (מידע בלבד).",
  resetPreviewPanel: "תוצאות בדיקת האיפוס — תנועות, קישורים והצעות.",
  savedDraftBanner: "נשמרה סессיית ייבוא קודמת. העלו שוב את אותו CSV ו«נתח קובץ».",
  discardDraft: "מחיקת הטיוטה מהשרת. לא מוחק תנועות שכבר יובאו.",
  csvFileInput: "בחירת קובץ CSV מ-RiseUp (אותו קובץ בכל המשך).",
  analyzeFileButton: "פענוח, התאמה לנתונים קיימים, זיהוי דפוסים והצעות ישויות.",
  fileRowSummary: "שם הקובץ ומספר השורות לאחר ניתוח.",
  needReviewBadge: "שורות עם התאמה לא בטוחה — בדקו לפני יצירה מרובה.",
  mostlyConfidentBadge: "לרוב השורות עם התאמה חזקה.",
  importStatusCounts: "חדשות / קיימות / שונו / לא חד משמעיות — סטטוס ייבוא.",
  draftSavedIndicator: "הבחירות שלכם נשמרו אוטומטית בשרת.",
  draftSaveFailed: "שמירת טיוטה נכשלה — ייתכן שינוי יאבד בסגירת הדף.",
  draftSaving: "שומר טיוטה…",
  startOver: "ניקוי הסессיה ומחיקת הטיוטה. לא מסיר תנועות שכבר נשמרו.",
  importSummaryBar: "תצוגה מקדימה של השמירה הבאה. שורות חדשות מדולגות עד שתסמנו «צור».",
  wizardTabInstruments: "אישור חשבונות בנק וכרטיסי אשראי חדשים.",
  wizardTabCoreMappings: "הצעות משלמים וקטגוריות.",
  wizardTabDomainEntities: "מנויים, utilities, ביטוח, תרומות וכד'.",
  wizardTabTransactions: "פעולות ייבוא לכל שורה. סינון לפי חודש, 100 שורות בעמוד.",
  wizardTabBackfill: "קישור תנועות שכבר יובאו לישויות.",
  statNeedsReview: "שורות שדורשות בדיקה ידנית. לחצו לפתיחת «תנועות» עם סינון «רק שורות לבדיקה».",
  statProposals: "סך ההצעות בכל הלשוניות. לחצו לפתיחת הלשונית עם הכי הרבה הצעות.",
  statPatterns: "דפוסים חוזרים בייצוא. לחצו לגלילה לרשימת הדפוסים.",
  statLegacyScanned: "תנועות RiseUp ישנות שנבדקו לזהות ייבוא.",
  statLegacyBackfilled: "תנועות ישנות שעודכנו עם מפתח ייבוא.",
  strongPatternsPanel: "דפוסים חזקים — סוג, משך, ממוצע.",
  proposalsSection: "הצעות לשלב הנוכחי — אשר, דחה, או דלג.",
  proposalActionSelect: "אשר = יצירה בשמירה. דחה = ביטול. דלג = המשך מאוחר יותר.",
  workExpenseCheckbox: "קישור מנוי מאושר לבן משפחה ומשרה (הוצאה מקצועית).",
  filterPaymentMonth: "הצגת תנועות לפי חודש תשלום.",
  filterImportStatus: "סינון לפי סטטוס ייבוא.",
  filterNeedsReviewOnly: "רק שורות שדורשות בדיקה.",
  bulkSkipExisting: "דילוג על כל השורות שכבר במערכת.",
  bulkSkipVisible: "דילוג על כל השורות המסוננות (לפני עימוד).",
  bulkCreateHighConfidence: "«צור» לשורות חדשות עם התאמה חזקה במסנן הנוכחי.",
  txFilterSummary: "ספירות: עמוד נוכחי, מסונן, מסומנות בתצוגה, מסומנות בכל הקובץ.",
  txPagination: "100 שורות בעמוד.",
  txTable: "שורה לכל תנועה. צהוב = בדיקה. עמום = קיים.",
  saveButton: "שמירת כל השורות עם Create/Update (בכל הקובץ) והצעות שאושרו.",
};

const wizardTabTooltipKeys: Record<string, string> = {
  instruments: "wizardTabInstruments",
  core_mappings: "wizardTabCoreMappings",
  domain_entities: "wizardTabDomainEntities",
  transaction_actions: "wizardTabTransactions",
  historical_backfill: "wizardTabBackfill",
};

export function riseUpImportGuideContent(isHe: boolean): RiseUpImportGuideContent {
  if (isHe) {
    return {
      modalTitle: "מדריך ייבוא RiseUp",
      openButton: "מדריך למשתמש",
      closeButton: "סגור",
      sections: hebrewSections,
      tooltips: hebrewTooltips,
      guideFooterHint: "רחפו מעל רכיבים במסך הייבוא להסברים מהירים.",
    };
  }
  return {
    modalTitle: "RiseUp import user guide",
    openButton: "User guide",
    closeButton: "Close",
    sections: englishSections,
    tooltips: englishTooltips,
    guideFooterHint: "Hover over controls in the import screen for quick explanations.",
  };
}

export function riseUpImportWizardTabTooltip(isHe: boolean, sectionId: string): string {
  const content = riseUpImportGuideContent(isHe);
  const key = wizardTabTooltipKeys[sectionId];
  return key ? content.tooltips[key] ?? "" : "";
}

export function riseUpImportTooltip(isHe: boolean, key: string): string {
  return riseUpImportGuideContent(isHe).tooltips[key] ?? "";
}
