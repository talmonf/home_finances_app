import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getJobDocumentStorageConfig } from "@/lib/object-storage";

export const dynamic = "force-dynamic";

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function dedupe(values: Array<string | null>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = getJobDocumentStorageConfig();
  const url = new URL(req.url);

  const requestOrigin = normalizeOrigin(req.headers.get("origin"));
  const publicAppUrl = normalizeOrigin(process.env.NEXTAUTH_URL ?? null);
  const appBaseUrl = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? null);
  const derivedHostOrigin =
    req.headers.get("host") && req.headers.get("x-forwarded-proto")
      ? normalizeOrigin(`${req.headers.get("x-forwarded-proto")}://${req.headers.get("host")}`)
      : null;

  const allowedOrigins = dedupe([
    requestOrigin,
    publicAppUrl,
    appBaseUrl,
    derivedHostOrigin,
    normalizeOrigin(url.searchParams.get("origin")),
  ]);

  const suggestedCorsRule = {
    AllowedOrigins: allowedOrigins.length ? allowedOrigins : ["https://YOUR_APP_DOMAIN"],
    AllowedMethods: ["GET", "HEAD", "POST", "PUT", "OPTIONS"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag", "x-amz-request-id", "x-amz-id-2"],
    MaxAgeSeconds: 3600,
  };

  return NextResponse.json({
    ok: true,
    storage: {
      bucket: cfg.bucket,
      endpoint: cfg.endpoint ?? "AWS default endpoint",
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle,
    },
    diagnosis: {
      likelyIssue:
        "Browser cannot reach or is blocked from storage upload endpoint (CORS/network), causing 'Failed to fetch'.",
      detectedOrigins: {
        requestOrigin,
        publicAppUrl,
        appBaseUrl,
        derivedHostOrigin,
      },
    },
    recommendedCors: {
      s3Json: [suggestedCorsRule],
      s3XmlExample: `<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>${suggestedCorsRule.AllowedOrigins[0]}</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>OPTIONS</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>x-amz-request-id</ExposeHeader>
    <ExposeHeader>x-amz-id-2</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`,
    },
    notes: [
      "If your app has multiple domains (prod + preview), add each exact origin.",
      "Do not use wildcard origin when credentials/cookies are required.",
      "After changing CORS, wait a minute and hard-refresh the browser before retesting.",
    ],
  });
}
