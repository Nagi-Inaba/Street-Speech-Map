import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

// NextAuth v5の設定
export const { handlers, signIn, signOut, auth } = NextAuth({
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

          const email = credentials.email as string;
          const password = credentials.password as string;

          // パスワードは開発用に「password」だけを許可
          // 本番では適切なパスワードハッシュ化を実装してください
          if (password !== "password") {
            console.log("[Auth] Invalid password");
            return null;
          }

          // 開発体験を簡単にするため、ユーザーが存在しなければ自動作成する
          // 本番では必ず事前にUserを作成し、ここでの自動作成は無効にしてください。
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.log("[Auth] Creating new user:", email);
            user = await prisma.user.create({
              data: {
                email,
                name: "管理者",
                role: "SiteAdmin",
              },
            });
          } else {
            console.log("[Auth] Found existing user:", user.email);
          }

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
