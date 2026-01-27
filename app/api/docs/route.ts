import { NextRequest, NextResponse } from "next/server";
import { addCorsHeaders, handleCorsPreflight } from "@/lib/api-middleware";

// OpenAPI 3.0仕様のドキュメント
const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "街頭演説マップ API",
    version: "1.0.0",
    description: "街頭演説マップの公開API。候補者情報や演説イベント情報を取得できます。",
    contact: {
      name: "API Support",
    },
  },
  servers: [
    {
      url: process.env.NEXTAUTH_URL || "http://localhost:3000",
      description: "本番環境",
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
  paths: {
    "/api/public/candidates": {
      get: {
        summary: "候補者一覧を取得",
        description: "すべての候補者情報の一覧を取得します。",
        tags: ["候補者"],
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "成功",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      slug: { type: "string" },
                      name: { type: "string" },
                      imageUrl: { type: "string", nullable: true },
                      type: { type: "string", enum: ["SINGLE", "PROPORTIONAL"] },
                      prefecture: { type: "string", nullable: true },
                      region: { type: "string", nullable: true },
                      showEvents: { type: "boolean" },
                      createdAt: { type: "string", format: "date-time" },
                      updatedAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "認証エラー",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "429": {
            description: "レート制限エラー",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    message: { type: "string" },
                    retryAfter: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/public/candidates/{slug}/events": {
      get: {
        summary: "候補者の演説イベント一覧を取得",
        description: "指定された候補者の演説イベント一覧を取得します。",
        tags: ["イベント"],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            description: "候補者のスラッグ",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "成功",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      candidateId: { type: "string" },
                      status: { type: "string", enum: ["PLANNED", "LIVE", "ENDED"] },
                      startAt: { type: "string", format: "date-time", nullable: true },
                      endAt: { type: "string", format: "date-time", nullable: true },
                      timeUnknown: { type: "boolean" },
                      lat: { type: "number" },
                      lng: { type: "number" },
                      locationText: { type: "string" },
                      notes: { type: "string", nullable: true },
                      submittedAt: { type: "string", format: "date-time" },
                      createdAt: { type: "string", format: "date-time" },
                      updatedAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "候補者が見つかりません",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "401": {
            description: "認証エラー",
          },
          "429": {
            description: "レート制限エラー",
          },
        },
      },
    },
    "/api/public/settings": {
      get: {
        summary: "公開設定を取得",
        description: "サイトの公開設定情報を取得します（認証不要）。",
        tags: ["設定"],
        responses: {
          "200": {
            description: "成功",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    showCandidateInfo: { type: "boolean" },
                    candidateLabel: { type: "string" },
                    showEvents: { type: "boolean" },
                    shareTemplateLive: { type: "string" },
                    shareTemplatePlanned: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "APIキーをX-API-Keyヘッダーに設定するか、Authorization: Bearer <APIキー>形式で送信してください。",
      },
    },
  },
};

export async function GET(request: NextRequest) {
  // CORS preflight リクエストを処理
  const corsResponse = handleCorsPreflight(request);
  if (corsResponse) return corsResponse;

  const response = NextResponse.json(openApiSpec);
  return addCorsHeaders(response, request);
}
