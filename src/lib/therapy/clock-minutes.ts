/** Clock minutes shown when choosing an appointment time: 00, 05, 10, … 55. */
export function fiveMinuteClockOptions(selectedMinute?: string): string[] {
  const options = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
  const normalized = selectedMinute?.padStart(2, "0");
  if (
    normalized &&
    /^\d{2}$/.test(normalized) &&
    Number(normalized) <= 59 &&
    !options.includes(normalized)
  ) {
    options.push(normalized);
    options.sort();
  }
  return options;
}
