const CLINIC_SPLASH_HOSTS = new Set([
  "soloclinic-il.com",
  "www.soloclinic-il.com",
  "localhost",
  "127.0.0.1",
]);

/** Hostname only, lowercased, with port stripped. */
export function hostnameFromHostHeader(host: string | null | undefined): string {
  const raw = (host ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    return end >= 0 ? raw.slice(1, end) : raw;
  }
  const colon = raw.indexOf(":");
  return colon >= 0 ? raw.slice(0, colon) : raw;
}

export function isClinicSplashHost(host: string | null | undefined): boolean {
  return CLINIC_SPLASH_HOSTS.has(hostnameFromHostHeader(host));
}

type HostHeaders = {
  get(name: string): string | null;
};

/** Public host: forwarded host, then Host, then the URL hostname. */
export function requestHostname(input: {
  headers: HostHeaders;
  nextUrlHostname?: string | null;
}): string {
  const forwarded = input.headers.get("x-forwarded-host");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  if (firstForwarded) return hostnameFromHostHeader(firstForwarded);
  const host = input.headers.get("host");
  if (host) return hostnameFromHostHeader(host);
  return hostnameFromHostHeader(input.nextUrlHostname ?? "");
}

export function isClinicSplashRequest(input: {
  headers: HostHeaders;
  nextUrlHostname?: string | null;
}): boolean {
  return isClinicSplashHost(requestHostname(input));
}
