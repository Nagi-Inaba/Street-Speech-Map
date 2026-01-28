import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import { Analytics } from "@vercel/analytics/next";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
});

// ベースURLを取得（環境変数から、またはデフォルト値を使用）
function getBaseUrl() {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "チームみらい 街頭演説マップ",
  description: "候補者の街頭演説予定・実施中・終了を地図で可視化",
  icons: {
    icon: "/icon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  openGraph: {
    title: "チームみらい 街頭演説マップ",
    description: "候補者の街頭演説予定・実施中・終了を地図で可視化",
    url: baseUrl,
    siteName: "チームみらい 街頭演説マップ",
    images: [
      {
        url: `${baseUrl}/icon.png`,
        width: 1200,
        height: 630,
        alt: "チームみらい 街頭演説マップ",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "チームみらい 街頭演説マップ",
    description: "候補者の街頭演説予定・実施中・終了を地図で可視化",
    images: [`${baseUrl}/icon.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJP.variable}>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
