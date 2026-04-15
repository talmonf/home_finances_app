import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const { id } = await params;
  const receipt = await prisma.therapy_receipts.findFirst({
    where: { id, household_id: householdId },
    select: { id: true },
  });
  if (!receipt) notFound();
  redirect(`/dashboard/private-clinic/receipts?modal=edit&edit_id=${encodeURIComponent(id)}`);
}
