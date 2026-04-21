import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    // Session expires after 8 hours; JWT refreshed on each request
    maxAge: 8 * 60 * 60, // 8 hours in seconds
  },
  cookies: {
    sessionToken: {
      // Le préfixe __Secure- exige HTTPS — interdit sur localhost (HTTP)
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=1",
    error: "/login?error=1",
  },
  providers: [
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM ?? "noreply@taxeasy.ch",
    }),
    // Dev-only credentials provider (for local testing without SMTP)
    ...(process.env.NODE_ENV === "development"
      ? [
          Credentials({
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              // Upsert dev user so any email works without pre-seeding
              const user = await prisma.user.upsert({
                where: { email: credentials.email as string },
                update: {},
                create: {
                  email: credentials.email as string,
                  name: "Dev User",
                  plan: "PREMIUM",
                },
              });
              return user;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create profile data for new users
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: "FREE" },
      });
    },
  },
});

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}
