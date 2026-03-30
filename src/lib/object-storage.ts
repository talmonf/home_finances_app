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
