import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
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
});

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Not authorized");
  }
  return session;
}

export async function requireHouseholdAdmin() {
  const session = await auth();
  if (!session?.user || session.user.isSuperAdmin) {
    throw new Error("Not authorized");
  }
  if (session.user.role !== "admin") {
    throw new Error("Not authorized");
  }
  return session;
}

export async function requireHouseholdMember() {
  const session = await auth();
  if (!session?.user || session.user.isSuperAdmin) {
    throw new Error("Not authorized");
  }
  return session;
}

export async function getCurrentHouseholdId() {
  const session = await auth();
  return session?.user?.householdId ?? null;
}

