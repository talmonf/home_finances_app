import type { MetadataRoute } from "next";
import { PRIVACY_POLICY_PATH } from "@/lib/privacy-policy-content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [PRIVACY_POLICY_PATH, "/login"],
    },
  };
}
