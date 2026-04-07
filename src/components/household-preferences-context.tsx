"use client";

import { createContext, useContext } from "react";
import type { HouseholdDateDisplayFormat } from "@/generated/prisma/client";
import type { UiLanguage } from "@/lib/ui-language";

const HouseholdPreferencesContext = createContext<{
  dateDisplayFormat: HouseholdDateDisplayFormat;
  uiLanguage: UiLanguage;
}>({
  dateDisplayFormat: "YMD",
  uiLanguage: "en",
});

export function HouseholdPreferencesProvider({
  dateDisplayFormat,
  uiLanguage,
  children,
}: {
  dateDisplayFormat: HouseholdDateDisplayFormat;
  uiLanguage: UiLanguage;
  children: React.ReactNode;
}) {
  return (
    <HouseholdPreferencesContext.Provider value={{ dateDisplayFormat, uiLanguage }}>
      {children}
    </HouseholdPreferencesContext.Provider>
  );
}

export function useHouseholdDateFormat(): HouseholdDateDisplayFormat {
  return useContext(HouseholdPreferencesContext).dateDisplayFormat;
}

export function useUiLanguage(): UiLanguage {
  return useContext(HouseholdPreferencesContext).uiLanguage;
}
