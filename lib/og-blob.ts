/**
 * OGP画像の保存/参照を Vercel Blob に寄せるためのヘルパー。
 *
 * - 本番(Vercel)では `BLOB_READ_WRITE_TOKEN` が設定されていれば Blob を優先
 * - ローカル等でトークンが無ければ null を返す（=従来の public/og-images を使用）
 */
import type { ImageResponse } from "@vercel/og";
import { join } from "path";

export const OG_BLOB_PREFIX = "og-images/";

function hasBlobToken(): boolean {
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

