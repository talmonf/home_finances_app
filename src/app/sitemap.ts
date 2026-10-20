import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/email/app-base-url";
import {
  PRIVACY_POLICY_LAST_UPDATED_ISO,
  PRIVACY_POLICY_PATH,
} from "@/lib/privacy-policy-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppBaseUrl();
  return [
    {
      url: `${base}${PRIVACY_POLICY_PATH}`,
      lastModified: PRIVACY_POLICY_LAST_UPDATED_ISO,
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];
}
