export type MorningEnvironment = "sandbox" | "production";

export function getMorningApiBase(environment: MorningEnvironment): string {
  if (environment === "sandbox") {
    return (
      process.env.MORNING_SANDBOX_API_BASE?.trim() ||
      "https://sandbox.d.greeninvoice.co.il/api/v1"
    );
  }
  return (
    process.env.MORNING_PRODUCTION_API_BASE?.trim() ||
    "https://api.greeninvoice.co.il/api/v1"
  );
}

export function getMorningAuthBase(environment: MorningEnvironment): string {
  if (environment === "sandbox") {
    return process.env.MORNING_SANDBOX_AUTH_BASE?.trim() || "https://api.sandbox.morning.dev";
  }
  return process.env.MORNING_PRODUCTION_AUTH_BASE?.trim() || "https://api.morning.co";
}
