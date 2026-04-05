"use client";

import { createContext, useContext } from "react";
import type { HouseholdDateDisplayFormat } from "@/generated/prisma/client";

const HouseholdDateFormatContext = createContext<HouseholdDateDisplayFormat>("YMD");

export function HouseholdPreferencesProvider({
  dateDisplayFormat,
  children,
}: {
  dateDisplayFormat: HouseholdDateDisplayFormat;
  children: React.ReactNode;
}) {
  return (
    <HouseholdDateFormatContext.Provider value={dateDisplayFormat}>
      {children}
    </HouseholdDateFormatContext.Provider>
  );
}

export function useHouseholdDateFormat(): HouseholdDateDisplayFormat {
  return useContext(HouseholdDateFormatContext);
}
