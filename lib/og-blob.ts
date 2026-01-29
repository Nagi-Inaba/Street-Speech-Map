/**
 * OGP画像の保存/参照用ヘルパー（基本方針: Blob運用）
 *
 * - 本番(Vercel): `BLOB_READ_WRITE_TOKEN` 設定時は Blob に保存・配信（ローカルファイルは参照しない）
 * - ローカル: トークンが無い場合は public/og-images を参照可能（開発用）
 */
import type { ImageResponse } from "@vercel/og";
import { join } from "path";

export const OG_BLOB_PREFIX = "og-images/";

/** 本番(Vercel)では true。Blob運用時はローカルファイルを参照しない。 */
export function hasBlobToken(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function getOgBlobUrl(pathname: string): Promise<string | null> {
  if (!hasBlobToken()) return null;
  const normalized = pathname.startsWith(OG_BLOB_PREFIX) ? pathname : join(OG_BLOB_PREFIX, pathname).replace(/\\/g, "/");

  const { list } = await import("@vercel/blob");
  const result = await list({ prefix: normalized, limit: 10, mode: "expanded" });
  const exact = result.blobs.find((b) => b.pathname === normalized);
  return exact?.url ?? null;
}

export async function putOgBlob(
  filenameOrPathname: string,
  imageResponse: ImageResponse
): Promise<string | null> {
  if (!hasBlobToken()) return null;

  const pathname = filenameOrPathname.startsWith(OG_BLOB_PREFIX)
    ? filenameOrPathname
    : `${OG_BLOB_PREFIX}${filenameOrPathname}`;

  const { put } = await import("@vercel/blob");
  const ab = await imageResponse.arrayBuffer();

  // PutBody は Fetch Body（ArrayBuffer/Blob/ReadableStream/string等）。Buffer は型的に弾かれるため ArrayBuffer を渡す。
  const { url } = await put(pathname, ab, {
    access: "public",
    addRandomSuffix: false,
    contentType: "image/png",
  });

  return url;
}

