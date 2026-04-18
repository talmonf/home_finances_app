import type { DefaultSession, NextAuthOptions } from "next-auth";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import {
  DEFAULT_HOUSEHOLD_DATE_DISPLAY_FORMAT,
  normalizeHouseholdDateDisplayFormat,
  type HouseholdDateDisplayFormat,
} from "@/lib/household-date-format";
import { DEFAULT_UI_LANGUAGE, normalizeUiLanguage, type UiLanguage } from "@/lib/ui-language";
import { SESSION_OBFUSCATE_COOKIE } from "@/lib/session-obfuscate-cookie";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new pg.Pool({
    connectionString: url,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "member";
      householdId?: string | null;
      isSuperAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "admin" | "member";
    householdId?: string | null;
    isSuperAdmin?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // 2 hours of inactivity (rolling expiry)
    maxAge: 2 * 60 * 60, // 2 hours in seconds
    // How often to write the session back, in seconds.
    // Keeps active users signed in while enforcing the 2-hour idle timeout.
    updateAge: 30 * 60, // 30 minutes
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const superAdmin = await prisma.super_admins.findUnique({
          where: { email: credentials.email },
        });

        if (superAdmin) {
          const valid = await bcrypt.compare(
            credentials.password,
            superAdmin.password_hash,
          );
          if (!valid) return null;

          return {
            id: superAdmin.id,
            name: superAdmin.full_name,
            email: superAdmin.email,
            role: "admin",
            householdId: null,
            isSuperAdmin: true,
          };
        }

        const user = await prisma.users.findUnique({
          where: { email: credentials.email },
          include: { household: true },
        });

        if (!user || !user.is_active) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
          householdId: user.household_id,
          isSuperAdmin: false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.householdId = (user as any).householdId ?? null;
        token.isSuperAdmin = (user as any).isSuperAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "admin" | "member") ?? "member";
        session.user.householdId = (token.householdId as string | null) ?? null;
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireSuperAdmin() {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Not authorized");
  }
  return session;
}

export async function requireHouseholdAdmin() {
  const session = await getAuthSession();
  if (!session?.user || session.user.isSuperAdmin) {
    throw new Error("Not authorized");
  }
  if (session.user.role !== "admin") {
    throw new Error("Not authorized");
  }
  return session;
}

export async function requireHouseholdMember() {
  const session = await getAuthSession();
  if (!session?.user || session.user.isSuperAdmin) {
    throw new Error("Not authorized");
  }
  return session;
}

export async function getCurrentHouseholdId() {
  const session = await getAuthSession();
  return session?.user?.householdId ?? null;
}

export async function getCurrentHouseholdDateDisplayFormat(): Promise<HouseholdDateDisplayFormat> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const householdId = session?.user?.householdId ?? null;
  if (!householdId) return DEFAULT_HOUSEHOLD_DATE_DISPLAY_FORMAT;

  if (userId && !session?.user?.isSuperAdmin) {
    const userRow = await prisma.users.findFirst({
      where: { id: userId, household_id: householdId },
      select: { date_display_format: true },
    });
    if (userRow?.date_display_format) {
      return normalizeHouseholdDateDisplayFormat(userRow.date_display_format);
    }
  }

  const row = await prisma.households.findUnique({
    where: { id: householdId },
    select: { date_display_format: true },
  });
  return normalizeHouseholdDateDisplayFormat(row?.date_display_format);
}

export async function getCurrentUiLanguage(): Promise<UiLanguage> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const householdId = session?.user?.householdId ?? null;
  if (!householdId) return DEFAULT_UI_LANGUAGE;

  if (userId && !session?.user?.isSuperAdmin) {
    const userRow = await prisma.users.findFirst({
      where: { id: userId, household_id: householdId },
      select: { ui_language: true },
    });
    if (userRow?.ui_language) {
      return normalizeUiLanguage(userRow.ui_language);
    }
  }

  const row = await prisma.households.findUnique({
    where: { id: householdId },
    select: { ui_language: true },
  });
  return normalizeUiLanguage(row?.ui_language);
}

/** When true, Private clinic views mask client names and monetary amounts (session cookie; demo / screen sharing). */
export async function getCurrentObfuscateSensitive(): Promise<boolean> {
  const session = await getAuthSession();
  if (!session?.user?.householdId || session.user.isSuperAdmin) {
    return false;
  }
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_OBFUSCATE_COOKIE)?.value === "1";
}

/** Per-user (super-admin managed): dashboard section useful-links banner and related UI. */
export async function getCurrentShowUsefulLinks(): Promise<boolean> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const householdId = session?.user?.householdId ?? null;
  if (!householdId || session?.user?.isSuperAdmin) {
    return true;
  }
  if (!userId) return true;
  const row = await prisma.users.findFirst({
    where: { id: userId, household_id: householdId },
    select: { show_useful_links: true },
  });
  return row?.show_useful_links ?? true;
}

/** Super-admin can disable per-entity Links (URL) panels for a household. */
export async function getHouseholdShowEntityUrlPanels(): Promise<boolean> {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId ?? null;
  if (!householdId || session?.user?.isSuperAdmin) {
    return true;
  }

  const row = await prisma.households.findUnique({
    where: { id: householdId },
    select: { show_entity_url_panels: true },
  });
  return row?.show_entity_url_panels ?? true;
}

