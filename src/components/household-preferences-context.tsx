"use client";

import { createContext, useContext } from "react";
import type { HouseholdDateDisplayFormat } from "@/generated/prisma/client";
import type { UiLanguage } from "@/lib/ui-language";

const HouseholdPreferencesContext = createContext<{
  dateDisplayFormat: HouseholdDateDisplayFormat;
  uiLanguage: UiLanguage;
  obfuscateSensitive: boolean;
}>({
  dateDisplayFormat: "YMD",
  uiLanguage: "en",
  obfuscateSensitive: false,
});

export function HouseholdPreferencesProvider({
  dateDisplayFormat,
  uiLanguage,
  obfuscateSensitive = false,
  children,
}: {
  dateDisplayFormat: HouseholdDateDisplayFormat;
  uiLanguage: UiLanguage;
  obfuscateSensitive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <HouseholdPreferencesContext.Provider
      value={{ dateDisplayFormat, uiLanguage, obfuscateSensitive }}
    >
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

export function useObfuscateSensitive(): boolean {
  return useContext(HouseholdPreferencesContext).obfuscateSensitive;
}
