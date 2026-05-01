import { Suspense } from "react";
import { ConsultationsPageContent, type ConsultationsPageSearchParams } from "./consultations-page-content";

export const dynamic = "force-dynamic";

export default function ConsultationsPage({
  searchParams,
}: {
  searchParams?: ConsultationsPageSearchParams;
}) {
  return (
    <Suspense fallback={null}>
      <ConsultationsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
