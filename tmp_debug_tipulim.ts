import * as XLSX from "xlsx";
import { analyzePrivateProfileForTest } from "@/lib/therapy/import-tipulim";

async function main() {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      קבלה: "00123.0",
      "תאריך תשלום": "",
      שולם: "",
      סכום: "100",
      מטופל: "דנה",
      תאריך: "2026-01-10",
      "סוג ביקור": "בית",
      הערות: "",
      "דרך תשלום": "",
    },
    {
      קבלה: "123",
      "תאריך תשלום": "2026-01-15",
      שולם: "100",
      סכום: "",
      מטופל: "",
      תאריך: "2026-01-15",
      "סוג ביקור": "",
      הערות: "",
      "דרך תשלום": "ביט",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");
  const scratch = await analyzePrivateProfileForTest(
    {
      householdId: "hh-1",
      jobId: "job-1",
      selectedProgramId: null,
      profile: "tipulim_private",
      workbook,
      sheetName: "Sheet1",
    },
    {
      isPrivateClinic: true,
      clients: [{ id: "c-1", first_name: "דנה", last_name: null }],
      programsByJob: [],
      bankAccounts: [],
      digitalMethods: [{ id: "dm-1", name: "ביט" }] as never[],
      jobFamilyMemberId: null,
      jobEmploymentType: "employee",
    },
  );
  console.log(scratch.errors);
  process.exit(0);
}

main();
