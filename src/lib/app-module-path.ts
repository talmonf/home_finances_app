/** True when the current URL belongs to the Clinic module (including the shared calendar). */
export function isClinicModulePath(pathname: string, clinicEnabled: boolean): boolean {
  const onSharedCalendar =
    pathname === "/dashboard/calendar" || pathname.startsWith("/dashboard/calendar/");
  return pathname.startsWith("/dashboard/private-clinic") || (clinicEnabled && onSharedCalendar);
}
