import { Suspense } from "react";
import ConsultationsLoadingFallback from "./consultations-loading-fallback";
import {
  ConsultationsPageContent,
  type ConsultationsPageSearchParams,
} from "./consultations-page-content";

export const dynamic = "force-dynamic";

export default function ConsultationsPage({
  searchParams,
}: {
  searchParams?: ConsultationsPageSearchParams;
}) {
  return (
    <Suspense fallback={<ConsultationsLoadingFallback />}>
      <ConsultationsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
