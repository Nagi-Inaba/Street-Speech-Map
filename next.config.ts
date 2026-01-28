import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel-storage.com",
      },
    ],
  },
  // @napi-rs/canvasはネイティブモジュールのため、サーバーコンポーネントの外部パッケージとして設定
  serverExternalPackages: ["@napi-rs/canvas"],
  webpack: (config, { isServer }) => {
    // @napi-rs/canvasはサーバーサイドでのみ使用するため、クライアント側のバンドルから除外
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        "@napi-rs/canvas": false,
      };
    }
    // サーバーサイドでも.nodeファイルを外部として扱う
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@napi-rs/canvas": "commonjs @napi-rs/canvas",
      });
    }
    return config;
  },
};

export default nextConfig;
