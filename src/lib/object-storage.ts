import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function buildS3Client() {
  const region = requiredEnv("RENTAL_STORAGE_REGION");
  const endpoint = process.env.RENTAL_STORAGE_ENDPOINT || undefined;
  const forcePathStyle = process.env.RENTAL_STORAGE_FORCE_PATH_STYLE === "true";
  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId: requiredEnv("RENTAL_STORAGE_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("RENTAL_STORAGE_SECRET_ACCESS_KEY"),
    },
  });
}

export type UploadRentalContractResult = {
  bucket: string;
  key: string;
  publicUrl: string | null;
};

export type UploadJobDocumentResult = {
  bucket: string;
  key: string;
  publicUrl: string | null;
};

export async function uploadRentalContractObject(
  householdId: string,
  rentalId: string,
  fileName: string,
  mimeType: string,
  content: Buffer,
): Promise<UploadRentalContractResult> {
  const bucket = requiredEnv("RENTAL_STORAGE_BUCKET");
  const key = `${householdId}/rentals/${rentalId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const client = buildS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: mimeType || "application/octet-stream",
    }),
  );

  const publicBase = process.env.RENTAL_STORAGE_PUBLIC_BASE_URL?.trim();
  const publicUrl = publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : null;
  return { bucket, key, publicUrl };
}

/**
 * Job documents can use dedicated JOB_STORAGE_* env vars, or fall back to RENTAL_STORAGE_*
 * so a single S3 bucket/credential set on Vercel works for both (keys are prefixed per domain).
 */
function getJobDocumentStorageConfig(): {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string | undefined;
  forcePathStyle: boolean;
  bucket: string;
  publicBaseUrl: string | null;
} {
  const region =
    process.env.JOB_STORAGE_REGION?.trim() || process.env.RENTAL_STORAGE_REGION?.trim();
  const accessKeyId =
    process.env.JOB_STORAGE_ACCESS_KEY_ID?.trim() ||
    process.env.RENTAL_STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.JOB_STORAGE_SECRET_ACCESS_KEY?.trim() ||
    process.env.RENTAL_STORAGE_SECRET_ACCESS_KEY?.trim();
  const bucket =
    process.env.JOB_STORAGE_BUCKET?.trim() || process.env.RENTAL_STORAGE_BUCKET?.trim();

  if (!region) {
    throw new Error("JOB_STORAGE_REGION or RENTAL_STORAGE_REGION is not configured");
  }
  if (!accessKeyId) {
    throw new Error(
      "JOB_STORAGE_ACCESS_KEY_ID or RENTAL_STORAGE_ACCESS_KEY_ID is not configured",
    );
  }
  if (!secretAccessKey) {
    throw new Error(
      "JOB_STORAGE_SECRET_ACCESS_KEY or RENTAL_STORAGE_SECRET_ACCESS_KEY is not configured",
    );
  }
  if (!bucket) {
    throw new Error("JOB_STORAGE_BUCKET or RENTAL_STORAGE_BUCKET is not configured");
  }

  const endpoint =
    process.env.JOB_STORAGE_ENDPOINT?.trim() ||
    process.env.RENTAL_STORAGE_ENDPOINT?.trim() ||
    undefined;

  const jobForce = process.env.JOB_STORAGE_FORCE_PATH_STYLE;
  const rentalForce = process.env.RENTAL_STORAGE_FORCE_PATH_STYLE;
  const forcePathStyle =
    jobForce === "true" || (jobForce === undefined && rentalForce === "true");

  const publicBase =
    process.env.JOB_STORAGE_PUBLIC_BASE_URL?.trim() ||
    process.env.RENTAL_STORAGE_PUBLIC_BASE_URL?.trim() ||
    null;

  return {
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    forcePathStyle,
    bucket,
    publicBaseUrl: publicBase,
  };
}

export async function uploadJobDocumentObject(
  householdId: string,
  jobId: string,
  fileName: string,
  mimeType: string,
  content: Buffer,
): Promise<UploadJobDocumentResult> {
  const cfg = getJobDocumentStorageConfig();
  const key = `${householdId}/jobs/${jobId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: content,
      ContentType: mimeType || "application/octet-stream",
    }),
  );

  const publicUrl = cfg.publicBaseUrl
    ? `${cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`
    : null;
  return { bucket: cfg.bucket, key, publicUrl };
}

export type UploadCarLicenseReceiptResult = {
  bucket: string;
  key: string;
  publicUrl: string | null;
};

export type UploadTherapyExpenseImageResult = {
  bucket: string;
  key: string;
  publicUrl: string | null;
};

/** Same bucket/credentials as job documents; keys under `car-licenses/{licenseId}/`. */
export async function uploadCarLicenseReceipt(
  householdId: string,
  licenseId: string,
  fileName: string,
  mimeType: string,
  content: Buffer,
): Promise<UploadCarLicenseReceiptResult> {
  const cfg = getJobDocumentStorageConfig();
  const key = `${householdId}/car-licenses/${licenseId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: content,
      ContentType: mimeType || "application/octet-stream",
    }),
  );

  const publicUrl = cfg.publicBaseUrl
    ? `${cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`
    : null;
  return { bucket: cfg.bucket, key, publicUrl };
}

/** Uses same storage config as job documents; keys are under `therapy-expenses/`. */
export async function uploadTherapyExpenseImage(
  householdId: string,
  expenseId: string,
  fileName: string,
  mimeType: string,
  content: Buffer,
): Promise<UploadTherapyExpenseImageResult> {
  const cfg = getJobDocumentStorageConfig();
  const key = `${householdId}/therapy-expenses/${expenseId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: content,
      ContentType: mimeType || "application/octet-stream",
    }),
  );

  const publicUrl = cfg.publicBaseUrl
    ? `${cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`
    : null;
  return { bucket: cfg.bucket, key, publicUrl };
}
