import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[Auth] Missing credentials");
            return null;
          }

          // パスワードは開発用に「password」だけを許可
          if (credentials.password !== "password") {
            console.log("[Auth] Invalid password");
            return null;
          }

          // 開発体験を簡単にするため、ユーザーが存在しなければ自動作成する
          // 本番では必ず事前にUserを作成し、ここでの自動作成は無効にしてください。
          let user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) {
            console.log("[Auth] Creating new user:", credentials.email);
            user = await prisma.user.create({
              data: {
                email: credentials.email as string,
                name: "管理者",
                role: "SiteAdmin",
              },
            });
          } else {
            console.log("[Auth] Found existing user:", user.email);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            region: user.region,
          };
        } catch (error) {
          console.error("[Auth] Error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as User).role;
        token.region = (user as User).region;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.region = token.region as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
});

export const { GET, POST } = handlers;
