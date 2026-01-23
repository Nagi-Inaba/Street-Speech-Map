import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// NextAuth v5の設定
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        userId: { label: "User ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.userId || !credentials?.password) {
            console.log("[Auth] Missing credentials");
            return null;
          }

          const userId = credentials.userId as string;
          const password = credentials.password as string;

          // 数字IDでユーザーを検索
          const user = await prisma.user.findUnique({
            where: { userId },
          });

          if (!user) {
            console.log("[Auth] User not found:", userId);
            return null;
          }

          // パスワードハッシュが設定されていない場合は認証失敗
          if (!user.passwordHash) {
            console.log("[Auth] Password hash not set for user:", userId);
            return null;
          }

          // パスワードを検証
          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          if (!isValidPassword) {
            console.log("[Auth] Invalid password for user:", userId);
            return null;
          }

          console.log("[Auth] Authentication successful for user:", userId);

          // NextAuth v5では、idは必須
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
      // 初回ログイン時にuserオブジェクトがある
      if (user) {
        token.id = user.id;
        token.role = user.role as string;
        token.region = user.region as string | null | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      // tokenの情報をsessionに反映
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.region = token.region as string | null | undefined;
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
  trustHost: true,
  // デバッグモード（開発時のみ）
  debug: process.env.NODE_ENV === "development",
});
