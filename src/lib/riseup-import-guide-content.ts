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
      "You do not need to finish thousands of rows in one sitting. Work tab by tab, month by month, and return later — your decisions are autosaved.",
      "The draft remembers your choices (Create/Skip, field picks, proposal decisions). After the first analyze, the export file is stored on the server so you can resume without re-uploading.",
    ],
  },
  {
    id: "start",
    title: "Getting started",
    paragraphs: [
      "First session: choose your RiseUp CSV and click Analyze file.",
      "Later sessions: if a saved draft appears, click Continue from draft — no file picker needed. The app re-analyzes the stored export, refreshes matches against your database, and restores your saved choices.",
    ],
    bullets: [
      "Continue from draft — one click when a draft exists and the export was stored from a previous analyze.",
      "Analyze file — required the first time, or when replacing the export with a newer RiseUp download.",
      "If the banner says the export was not stored yet, re-upload the same CSV once; after that, Continue from draft works.",
      "CSV file (optional — replace export) — upload a different file only when you intentionally want to switch exports.",
      "Use Start over or Discard saved draft only when you want a clean slate.",
    ],
  },
  {
    id: "tabs",
    title: "Wizard tabs (work in this order)",
    bullets: [
      "Step 1 — Setup: tabs 1–3. Step 2 — Transactions: tab 4. The banner at the top tells you which phase you are in.",
      "1. Instruments — approve new bank accounts and credit cards detected in the export.",
      "2. Mappings — review payee and category suggestions.",
      "3. Entities — subscriptions, utilities, insurance, donations, and similar entities.",
      "4. Transactions — decide Create / Skip / Update per row (work in monthly chunks here).",
      "Backfill — only appears when historical link proposals exist; links already-imported transactions to new entities.",
    ],
  },
  {
    id: "counts",
    title: "Understanding the counts",
    bullets: [
      "Rows — total lines in the CSV after analysis.",
      "Need review — uncertain matches (payee, card/account, zero amount, etc.); shown in amber. Click the stat card to open Transactions filtered to needs review only.",
      "New — not in the app yet. Existing — already imported (default Skip on re-import). Changed — same row, different content. Ambiguous — duplicate identity; needs manual decision.",
      "Proposals — staged suggestions waiting for Approve / Reject in tabs 1–3. Click the stat card to jump to the tab with the most proposals.",
      "Patterns — recurring behavior detected across the file. Click the stat card to show the pattern list (hidden by default).",
      "Step banner — Step 1 reminds you to finish tabs 1–3; Step 2 shows how many rows are queued to save on the Transactions tab.",
      "Save N transactions and continue — the number is all rows marked Create or Update across the entire file, not just the current page.",
    ],
  },
  {
    id: "chunks",
    title: "Working in chunks (Transactions tab)",
    paragraphs: [
      "New rows default to Skip so nothing is imported until you choose. Use filters and bulk actions to queue one batch at a time.",
    ],
    bullets: [
      "Opening tab 4 selects the latest payment month automatically.",
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
      "The green button saves all rows marked Create/Update across the entire file, plus any proposals you approved in tabs 1–3.",
      "After a partial save, committed rows become Existing and the wizard stays open if work remains.",
      "When every row is imported and proposals are handled, the session closes and the draft is cleared.",
    ],
  },
  {
    id: "draft",
    title: "Draft persistence",
    paragraphs: [
      "The draft does not freeze the CSV rows — it stores your review decisions. Each resume re-runs analyze so row status (new/existing/changed) stays accurate after partial saves.",
    ],
    bullets: [
      "Autosaved every few seconds: row actions, field overrides, proposal decisions, filters, and active tab.",
      "After Analyze file, the CSV export is stored server-side for Continue from draft.",
      "Draft saved appears in the header while autosave succeeds.",
      "Closing the browser is fine — open the import page and click Continue from draft.",
      "Discard saved draft removes decisions and the stored export; it does not delete transactions already committed.",
    ],
  },
  {
    id: "workflow",
    title: "Recommended multi-session workflow",
    bullets: [
      "Session 1: Upload CSV → Analyze file → tabs 1–3. Save with all transactions still on Skip to create entities only.",
      "Session 2+: Continue from draft → tab 4 Transactions — pick one month, bulk-create high-confidence rows, Save N transactions and continue.",
      "Repeat monthly until New reaches zero.",
      "Prioritize amber need-review rows before trusting bulk create.",
    ],
  },
  {
    id: "advanced",
    title: "Advanced",
    bullets: [
      "Advanced (collapsed at the bottom) — Check reset impact previews how many RiseUp transactions, links, and proposals would be affected by a full reset.",
      "Legacy import keys — if shown, counts older RiseUp transactions updated with stable import identity keys during analyze.",
    ],
  },
];

const hebrewSections: RiseUpImportGuideSection[] = [
  {
    id: "overview",
    title: "מה המסך הזה עושה",
    paragraphs: [
      "ייבוא קובץ CSV מ-RiseUp, בדיקת התאמה לחשבונות, משלמים, קטגוריות וישויות קיימות, ושמירה בקבוצות מבוקרות.",
      "אין צורך לסיים אלפי שורות בישיבה אחת. עבדו לפי לשונית, לפי חודש, וחזרו מאוחר יותר — ההחלטות נשמרות אוטומטית.",
      "הטיוטה זוכרת את הבחירות שלכם (צור/דלג, שדות, הצעות). אחרי «נתח קובץ» הראשון, הקובץ נשמר בשרת ואפשר להמשיך בלי העלאה מחדש.",
    ],
  },
  {
    id: "start",
    title: "התחלה",
    paragraphs: [
      "סессיה ראשונה: בחרו קובץ RiseUp CSV ולחצו «נתח קובץ».",
      "סессיות המשך: אם מופיעה טיוטה שמורה, לחצו «המשך מהטיוטה» — בלי בחירת קובץ. המערכת מנתחת מחדש את הקובץ השמור, מתאימה מול מסד הנתונים, ומחזירה את הבחירות.",
    ],
    bullets: [
      "«המשך מהטיוטה» — לחיצה אחת כשיש טיוטה והקובץ נשמר מניתוח קודם.",
      "«נתח קובץ» — נדרש בפעם הראשונה, או כשמחליפים לייצוא חדש מ-RiseUp.",
      "אם מופיע שהקובץ לא נשמר — העלו את אותו CSV פעם אחת; מכאן «המשך מהטיוטה» יעבוד.",
      "«קובץ CSV (אופציונלי)» — רק כשרוצים להחליף ייצוא במכוון.",
      "«התחל מחדש» / «מחק טיוטה» — רק לסессיה נקייה.",
    ],
  },
  {
    id: "tabs",
    title: "לשוניות האשף (סדר עבודה מומלץ)",
    bullets: [
      "שלב 1 — הגדרה: לשוניות 1–3. שלב 2 — תנועות: לשונית 4. הסרגל למעלה מציין באיזה שלב אתם.",
      "1. אמצעי תשלום — אישור חשבונות בנק וכרטיסי אשראי חדשים.",
      "2. התאמות — משלמים וקטגוריות.",
      "3. ישויות — מנויים, utilities, ביטוח, תרומות וכד'.",
      "4. תנועות — Create / Skip / Update לכל שורה (עבודה לפי חודש).",
      "קישור היסטורי — מופיע רק כשיש הצעות קישור; מקשר תנועות שכבר יובאו לישויות.",
    ],
  },
  {
    id: "counts",
    title: "הבנת המספרים",
    bullets: [
      "שורות — סך השורות בקובץ לאחר ניתוח.",
      "דורשות בדיקה — התאמות לא בטוחות; מסומן בצהוב. לחצו על הכרטיס לפתיחת «תנועות» עם סינון בדיקה.",
      "חדשות / קיימות / שונו / לא חד משמעיות — סטטוס ייבוא לכל שורה.",
      "הצעות — לאישור/דחייה בלשוניות 1–3. לחצו על הכרטיס לקפיצה ללשונית עם הכי הרבה הצעות.",
      "דפוסים — התנהגות חוזרת. לחצו על הכרטיס להצגת הרשימה (מוסתר כברירת מחדל).",
      "סרגל השלבים — שלב 1: סיימו 1–3; שלב 2: כמה שורות מסומנות לשמירה.",
      "«שמור N תנועות והמשך» — N הוא בכל הקובץ, לא רק בעמוד הנוכחי.",
    ],
  },
  {
    id: "chunks",
    title: "עבודה בקבוצות (לשונית תנועות)",
    paragraphs: [
      "שורות חדשות מדולגות כברירת מחדל. סננו והשתמשו בפעולות מרובות כדי לייבא קבוצה אחת בכל פעם.",
    ],
    bullets: [
      "פתיחת לשונית 4 בוחרת אוטומטית את חודש התשלום האחרון.",
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
      "הכפתור הירוק שומר את כל השורות עם Create/Update בקובץ, וגם הצעות שאושרו בלשוניות 1–3.",
      "לאחר שמירה חלקית השורות שנשמרו הופכות ל«קיימות» והאשף נשאר פתוח אם נשאר עבודה.",
      "כשהכל יובא — הסессיה נסגרת והטיוטה נמחקת.",
    ],
  },
  {
    id: "draft",
    title: "שמירת טיוטה",
    paragraphs: [
      "הטיוטה לא שומרת את שורות הקובץ — היא שומרת החלטות. כל המשך מריץ ניתוח מחדש כדי שסטטוס (חדש/קיים/שונה) יישאר מדויק אחרי שמירה חלקית.",
    ],
    bullets: [
      "נשמר אוטומטית: פעולות, התאמות, הצעות, מסננים ולשונית פעילה.",
      "אחרי «נתח קובץ», הקובץ נשמר בשרת ל«המשך מהטיוטה».",
      "«טיוטה נשמרה» מופיע כשהשרת קיבל את הסессיה.",
      "סגירת הדפדפן בטוחה — פתחו את מסך הייבוא ולחצו «המשך מהטיוטה».",
      "«מחק טיוטה» מסיר החלטות וקובץ שמור; לא מוחק תנועות שכבר נשמרו.",
    ],
  },
  {
    id: "workflow",
    title: "זרימת עבודה מומלצת",
    bullets: [
      "סессיה 1: העלאה → «נתח קובץ» → לשוניות 1–3. שמרו עם כל התנועות על Skip.",
      "סессיות 2+: «המשך מהטיוטה» → לשונית 4 — חודש אחד, צור חדשות בטוחות, שמור N תנועות והמשך.",
      "חזרו על כל חודש עד שלא נשארות שורות חדשות.",
      "העדיפו שורות «דורשות בדיקה» לפני יצירה מרובה.",
    ],
  },
  {
    id: "advanced",
    title: "מתקדם",
    bullets: [
      "«מתקדם» (למטה) — «בדיקת השפעת איפוס» מציגה כמה תנועות RiseUp, קישורים והצעות יושפעו מאיפוס מלא.",
      "מפתחות ייבוא ישנים — אם מוצג, ספירת תנועות RiseUp ישנות שעודכנו במפתח ייבוא יציב במהלך הניתוח.",
    ],
  },
];

const englishTooltips: Record<string, string> = {
  headerTitle: "RiseUp CSV import wizard — analyze, review matches, save in batches.",
  headerSubtitle: "Export from RiseUp as CSV, review in numbered tabs, import transactions by month.",
  userGuideButton: "Open the full user guide with workflow steps and explanations.",
  checkResetImpact: "Preview how many RiseUp transactions, links, and proposals would be affected by a full reset (under Advanced).",
  resetPreviewPanel: "Results of the reset impact check — counts of transactions, enriched rows, entity links, and downstream dependencies.",
  savedDraftBanner: "Your review decisions are saved. Click Continue from draft to resume without re-uploading (when the export was stored).",
  continueFromDraftButton: "Re-analyze the stored export, refresh database matches, and restore your saved choices.",
  discardDraft: "Delete the saved draft and stored export from the server. Does not delete imported transactions.",
  csvFileInput: "RiseUp CSV export. Optional when Continue from draft is available — use only to replace the stored export.",
  analyzeFileButton: "Parse the CSV, match rows to existing data, store the export for future sessions, and stage entity proposals.",
  fileRowSummary: "Imported file name and total row count after analysis.",
  needReviewBadge: "Rows with uncertain matches — wrong payee, unclear card/account, zero amount, etc. Review before bulk create.",
  mostlyConfidentBadge: "Most rows have strong automatic matches.",
  importStatusCounts: "New = not imported yet. Existing = already in app. Changed = content differs. Ambiguous = duplicate identity conflict.",
  draftSavedIndicator: "Your review choices were autosaved to the server.",
  draftSaveFailed: "Autosave failed — check connection; changes may be lost if you close the page.",
  draftSaving: "Autosaving your session…",
  startOver: "Clear the current session and delete the saved draft. Does not remove transactions already committed.",
  stepBanner: "Step 1 — finish tabs 1–3 and approve proposals. Step 2 — filter by month on tab 4 and queue rows to save.",
  wizardTabInstruments: "Tab 1 — approve new bank accounts and credit cards found in the export.",
  wizardTabCoreMappings: "Tab 2 — review payee and category mapping proposals.",
  wizardTabDomainEntities: "Tab 3 — subscriptions, utilities, insurance, donations, and other entity proposals.",
  wizardTabTransactions: "Tab 4 — per-row import actions. Filter by month and work in pages of 100 rows.",
  wizardTabBackfill: "Link already-imported transactions to entities when historical proposals exist.",
  statNeedsReview: "Rows flagged for manual review. Click to open tab 4 filtered to needs review only.",
  statProposals: "Staged entity proposals in tabs 1–3. Click to open the tab with the most proposals.",
  statPatterns: "Recurring patterns in the export. Click to show the pattern list (hidden by default).",
  statLegacyScanned: "Older RiseUp transactions checked for missing import keys (shown under Advanced when relevant).",
  statLegacyBackfilled: "Legacy transactions updated with import identity keys (shown under Advanced when relevant).",
  strongPatternsPanel: "High-confidence recurring patterns — each line shows type, duration, and average amount.",
  proposalsSection: "Staged proposals for the active wizard step. Approve, reject, or skip for now.",
  proposalActionSelect: "Approve creates the entity on save. Reject dismisses. Skip for now leaves it for a later session.",
  workExpenseCheckbox: "Link an approved subscription to a family member and job for work expense tracking.",
  filterPaymentMonth: "Show only transactions paid in this month. Opening tab 4 picks the latest month automatically.",
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
  headerSubtitle: "ייצוא מ-RiseUp כ-CSV, בדיקה בלשוניות ממוספרות, ייבוא תנועות לפי חודש.",
  userGuideButton: "פתיחת מדריך מלא עם שלבי עבודה והסברים.",
  checkResetImpact: "תצוגה מקדימה של השפעת איפוס RiseUp (תחת «מתקדם»).",
  resetPreviewPanel: "תוצאות בדיקת האיפוס — תנועות, קישורים והצעות.",
  savedDraftBanner: "ההחלטות שלכם שמורות. לחצו «המשך מהטיוטה» בלי העלאה מחדש (כשהקובץ נשמר).",
  continueFromDraftButton: "ניתוח מחדש של הקובץ השמור, התאמה למסד הנתונים, והחזרת הבחירות.",
  discardDraft: "מחיקת הטיוטה והקובץ השמור מהשרת. לא מוחק תנועות שכבר יובאו.",
  csvFileInput: "קובץ CSV מ-RiseUp. אופציונלי כש«המשך מהטיוטה» זמין — להחלפת ייצוא בלבד.",
  analyzeFileButton: "פענוח, התאמה, שמירת הקובץ לסессיות הבאות, והצעות ישויות.",
  fileRowSummary: "שם הקובץ ומספר השורות לאחר ניתוח.",
  needReviewBadge: "שורות עם התאמה לא בטוחה — בדקו לפני יצירה מרובה.",
  mostlyConfidentBadge: "לרוב השורות עם התאמה חזקה.",
  importStatusCounts: "חדשות / קיימות / שונו / לא חד משמעיות — סטטוס ייבוא.",
  draftSavedIndicator: "הבחירות שלכם נשמרו אוטומטית בשרת.",
  draftSaveFailed: "שמירת טיוטה נכשלה — ייתכן שינוי יאבד בסגירת הדף.",
  draftSaving: "שומר טיוטה…",
  startOver: "ניקוי הסессיה ומחיקת הטיוטה. לא מסיר תנועות שכבר נשמרו.",
  stepBanner: "שלב 1 — סיימו לשוניות 1–3. שלב 2 — סננו לפי חודש בלשונית 4.",
  wizardTabInstruments: "לשונית 1 — אישור חשבונות בנק וכרטיסי אשראי חדשים.",
  wizardTabCoreMappings: "לשונית 2 — הצעות משלמים וקטגוריות.",
  wizardTabDomainEntities: "לשונית 3 — מנויים, utilities, ביטוח, תרומות וכד'.",
  wizardTabTransactions: "לשונית 4 — פעולות ייבוא. סינון לפי חודש, 100 שורות בעמוד.",
  wizardTabBackfill: "קישור תנועות שכבר יובאו לישויות.",
  statNeedsReview: "שורות לבדיקה ידנית. לחצו לפתיחת לשונית 4 עם סינון בדיקה.",
  statProposals: "הצעות בלשוניות 1–3. לחצו לפתיחת הלשונית עם הכי הרבה הצעות.",
  statPatterns: "דפוסים חוזרים. לחצו להצגת הרשימה (מוסתר כברירת מחדל).",
  statLegacyScanned: "תנועות RiseUp ישנות שנבדקו לזהות ייבוא (תחת «מתקדם»).",
  statLegacyBackfilled: "תנועות ישנות שעודכנו במפתח ייבוא (תחת «מתקדם»).",
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
      guideFooterHint: "פתחו מדריך זה בכל עת מהקישור «מדריך למשתמש» במסך הייבוא.",
    };
  }
  return {
    modalTitle: "RiseUp import user guide",
    openButton: "User guide",
    closeButton: "Close",
    sections: englishSections,
    tooltips: englishTooltips,
    guideFooterHint: "Reopen this guide anytime from the User guide link on the import screen.",
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
