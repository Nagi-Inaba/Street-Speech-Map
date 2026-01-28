/**
 * OGP画像生成ユーティリティ
 * 事前生成用の画像をファイルとして保存
 */

import { ImageResponse } from "@vercel/og";
import { writeFile, mkdir, appendFile } from "fs/promises";
import { join } from "path";
import { generateMapScreenshot } from "./map-screenshot";
import { formatJSTWithoutYear } from "./time";
import type { SpeechEvent, Candidate } from "@prisma/client";

/**
 * フォールバック用：地図なしのテキストのみのOGP画像を生成（ファイル保存なし）
 */
function generateFallbackEventOgImage(
  event: SpeechEvent & { candidate: Candidate }
): ImageResponse {
  const isLive = event.status === "LIVE";
  const statusText = isLive ? "実施中" : "予定";

  let dateTimeText = "時間未定";
  if (event.startAt) {
    dateTimeText = formatJSTWithoutYear(event.startAt);
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to right, #64D8C6 0%, #64D8C6 50%, #bcecd3 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* 吹き出し風のテキストボックス */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "40px 60px",
            borderRadius: "16px",
            border: "3px solid #000000",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            maxWidth: "800px",
          }}
        >
          {/* ステータスバッジ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 32px",
              borderRadius: "999px",
              fontSize: "32px",
              fontWeight: "bold",
              marginBottom: "40px",
              letterSpacing: "0.08em",
              border: isLive ? "3px solid #16a34a" : "3px solid #f97316",
              backgroundColor: isLive ? "#dcfce7" : "#fff7ed",
              color: isLive ? "#166534" : "#9a3412",
            }}
          >
            {statusText}
          </div>

          {/* 候補者名 */}
          <div
            style={{
              fontSize: "56px",
              fontWeight: "bold",
              color: "#000000",
              marginBottom: "32px",
              textAlign: "center",
            }}
          >
            {event.candidate.name}
          </div>

          {/* 場所名 */}
          <div
            style={{
              fontSize: "36px",
              color: "#000000",
              marginBottom: "24px",
              textAlign: "center",
              fontWeight: "600",
            }}
          >
            {event.locationText}
          </div>

          {/* 時間 */}
          <div
            style={{
              fontSize: "28px",
              color: "#000000",
              textAlign: "center",
            }}
          >
            {dateTimeText}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

/**
 * フォールバック用：候補者ページの地図なしOGP画像を生成（ファイル保存なし）
 */
function generateFallbackCandidateOgImage(
  candidate: Candidate & { events: SpeechEvent[] }
): ImageResponse {
  const firstEvent = candidate.events.find(
    (e) => e.status === "PLANNED" || e.status === "LIVE"
  );
  const isLive = firstEvent?.status === "LIVE";
  const statusText = isLive ? "実施中" : "予定";

  let dateTimeText = "時間未定";
  if (firstEvent?.startAt) {
    dateTimeText = formatJSTWithoutYear(firstEvent.startAt);
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to right, #64D8C6 0%, #64D8C6 50%, #bcecd3 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* 吹き出し風のテキストボックス */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "40px 60px",
            borderRadius: "16px",
            border: "3px solid #000000",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            maxWidth: "800px",
          }}
        >
          {/* ステータスバッジ */}
          {firstEvent && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 32px",
                borderRadius: "999px",
                fontSize: "32px",
                fontWeight: "bold",
                marginBottom: "40px",
                letterSpacing: "0.08em",
                border: isLive ? "3px solid #16a34a" : "3px solid #f97316",
                backgroundColor: isLive ? "#dcfce7" : "#fff7ed",
                color: isLive ? "#166534" : "#9a3412",
              }}
            >
              {statusText}
            </div>
          )}

          {/* 候補者名 */}
          <div
            style={{
              fontSize: "56px",
              fontWeight: "bold",
              color: "#000000",
              marginBottom: firstEvent ? "32px" : "0",
              textAlign: "center",
            }}
          >
            {candidate.name}
          </div>

          {/* 場所名と時間（最初のイベントがある場合） */}
          {firstEvent && (
            <>
              <div
                style={{
                  fontSize: "36px",
                  color: "#000000",
                  marginTop: "32px",
                  marginBottom: "24px",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                {firstEvent.locationText}
              </div>

              <div
                style={{
                  fontSize: "28px",
                  color: "#000000",
                  textAlign: "center",
                }}
              >
                {dateTimeText}
              </div>
            </>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

/**
 * フォールバック用：トップページの地図なしOGP画像を生成（ファイル保存なし）
 */
function generateFallbackHomeOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to right, #64D8C6 0%, #64D8C6 50%, #bcecd3 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* タイトルテキスト */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "40px 60px",
            borderRadius: "16px",
            border: "3px solid #000000",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            maxWidth: "800px",
          }}
        >
          <div
            style={{
              fontSize: "56px",
              fontWeight: "bold",
              color: "#000000",
              textAlign: "center",
            }}
          >
            チームみらい
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: "#000000",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            街頭演説マップ
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

/**
 * フォールバック用：エリアページの地図なしOGP画像を生成（ファイル保存なし）
 */
function generateFallbackAreaOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to right, #64D8C6 0%, #64D8C6 50%, #bcecd3 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* タイトルテキスト */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "40px 60px",
            borderRadius: "16px",
            border: "3px solid #000000",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            maxWidth: "800px",
          }}
        >
          <div
            style={{
              fontSize: "56px",
              fontWeight: "bold",
              color: "#000000",
              textAlign: "center",
            }}
          >
            エリアごと演説予定
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: "#000000",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            チームみらい 街頭演説マップ
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

// フォールバック関数をエクスポート
export {
  generateFallbackEventOgImage,
  generateFallbackCandidateOgImage,
  generateFallbackHomeOgImage,
  generateFallbackAreaOgImage,
};

const OG_IMAGES_DIR = join(process.cwd(), "public", "og-images");

/**
 * ディレクトリが存在しない場合は作成
 */
async function ensureDirectory() {
  try {
    await mkdir(OG_IMAGES_DIR, { recursive: true });
  } catch (error) {
    // 既に存在する場合は無視
  }
}

/**
 * OGP画像をファイルとして保存
 */
async function saveOgImage(filename: string, imageResponse: ImageResponse): Promise<string> {
  await ensureDirectory();
  const buffer = await imageResponse.arrayBuffer();
  const filePath = join(OG_IMAGES_DIR, filename);
  await writeFile(filePath, Buffer.from(buffer));
  return `/og-images/${filename}`;
}

/**
 * イベント個別ページのOGP画像を生成して保存
 */
export async function generateEventOgImage(
  event: SpeechEvent & { candidate: Candidate }
): Promise<string> {
  const isLive = event.status === "LIVE";
  const statusText = isLive ? "実施中" : "予定";

  let dateTimeText = "時間未定";
  if (event.startAt) {
    dateTimeText = formatJSTWithoutYear(event.startAt);
  }

  // 地図スクリーンショットを生成（ピン位置のクローズアップ）
  let mapImageDataUrl: string | null = null;
  try {
    console.log(`[OGP画像生成] イベント ${event.id} の地図生成を開始...`);
    
    // #region agent log
    const debugLogPath = join(process.cwd(), ".cursor", "debug.log");
    await appendFile(debugLogPath, JSON.stringify({location:'lib/og-image-generator.tsx:425',message:'Before map generation',data:{eventId:event.id,lat:event.lat,lng:event.lng,isLive},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}) + "\n").catch(()=>{});
    // #endregion
    
    mapImageDataUrl = await Promise.race([
      generateMapScreenshot(
        [event.lat, event.lng],
        16, // クローズアップ用にズームレベル16
        1000,
        630,
        [{
          position: [event.lat, event.lng],
          color: isLive ? "red" : "blue",
          popup: {
            candidateName: event.candidate.name,
            locationText: event.locationText,
            timeText: dateTimeText,
          },
        }]
      ),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("Map generation timeout after 30 seconds")), 30000)
      ),
    ]);
    
    // #region agent log
    await appendFile(debugLogPath, JSON.stringify({location:'lib/og-image-generator.tsx:446',message:'Map generation success',data:{eventId:event.id,mapImageDataUrlLength:mapImageDataUrl?.length||0,hasMapImage:!!mapImageDataUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}) + "\n").catch(()=>{});
    // #endregion
    
    console.log(`[OGP画像生成] イベント ${event.id} の地図生成に成功`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[OGP画像生成] イベント ${event.id} の地図生成に失敗:`, errorMessage);
    console.error(`[OGP画像生成] エラーの詳細:`, error);
    
    // #region agent log
    await appendFile(debugLogPath, JSON.stringify({location:'lib/og-image-generator.tsx:448',message:'Map generation failed',data:{eventId:event.id,error:errorMessage,errorType:error?.constructor?.name,errorStack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}) + "\n").catch(()=>{});
    // #endregion
    
    // 地図なしで続行
  }
  
  // #region agent log
  const debugLogPath = join(process.cwd(), ".cursor", "debug.log");
  await appendFile(debugLogPath, JSON.stringify({location:'lib/og-image-generator.tsx:454',message:'Before ImageResponse creation',data:{eventId:event.id,hasMapImage:!!mapImageDataUrl,mapImageDataUrlLength:mapImageDataUrl?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}) + "\n").catch(()=>{});
  // #endregion

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to right, #64D8C6 0%, #64D8C6 50%, #bcecd3 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* 地図画像を背景として使用 */}
        {mapImageDataUrl ? (
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "80px",
              right: "80px",
              bottom: "60px",
              backgroundColor: "white",
              border: "4px solid #000000",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <img
              src={mapImageDataUrl}
              alt="地図"
              width={1000}
              height={630}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        ) : (
          /* 地図が生成されなかった場合のみテキストカードを表示 */
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "white",
              padding: "40px 60px",
              borderRadius: "16px",
              border: "3px solid #000000",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              maxWidth: "800px",
              zIndex: 10,
            }}
          >
            {/* ステータスバッジ */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 32px",
                borderRadius: "999px",
                fontSize: "32px",
                fontWeight: "bold",
                marginBottom: "40px",
                letterSpacing: "0.08em",
                border: isLive ? "3px solid #16a34a" : "3px solid #f97316",
                backgroundColor: isLive ? "#dcfce7" : "#fff7ed",
                color: isLive ? "#166534" : "#9a3412",
              }}
            >
              {statusText}
            </div>

            {/* 候補者名 */}
            <div
              style={{
                fontSize: "56px",
                fontWeight: "bold",
                color: "#000000",
                marginBottom: "32px",
                textAlign: "center",
              }}
            >
              {event.candidate.name}
            </div>

            {/* 場所名 */}
            <div
              style={{
                fontSize: "36px",
                color: "#000000",
                marginBottom: "24px",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              {event.locationText}
            </div>

            {/* 時間 */}
            <div
              style={{
                fontSize: "28px",
                color: "#000000",
                textAlign: "center",
              }}
            >
              {dateTimeText}
            </div>
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  const filename = `event-${event.id}.png`;
  return await saveOgImage(filename, imageResponse);
}

/**
 * 候補者ページのOGP画像を生成して保存
 */
export async function generateCandidateOgImage(
  candidate: Candidate & { events: SpeechEvent[] }
): Promise<string> {
  const firstEvent = candidate.events.find(
    (e) => e.status === "PLANNED" || e.status === "LIVE"
  );
  const isLive = firstEvent?.status === "LIVE";
  const statusText = isLive ? "実施中" : "予定";

  let dateTimeText = "時間未定";
  if (firstEvent?.startAt) {
    dateTimeText = formatJSTWithoutYear(firstEvent.startAt);
  }

  // 候補者のすべてのイベント位置を取得
  const eventPositions: Array<[number, number]> = candidate.events
    .filter((e) => e.status !== "ENDED")
    .map((e) => [e.lat, e.lng] as [number, number]);

  // 地図の中心位置を計算
  let mapCenter: [number, number] = [35.6812, 139.7671]; // デフォルト: 東京駅
  let zoom = 13;
  if (eventPositions.length > 0) {
    const centerLat = eventPositions.reduce((sum, [lat]) => sum + lat, 0) / eventPositions.length;
    const centerLng = eventPositions.reduce((sum, [, lng]) => sum + lng, 0) / eventPositions.length;
    mapCenter = [centerLat, centerLng];
    
    // ピン間の距離を計算して適切なズームレベルを決定
    const distances = eventPositions.map(([lat, lng]) => {
      const dLat = lat - centerLat;
      const dLng = lng - centerLng;
      return Math.sqrt(dLat * dLat + dLng * dLng);
    });
    const maxDistance = Math.max(...distances);
    
    if (maxDistance > 0.1) {
      zoom = 10;
    } else if (maxDistance > 0.05) {
      zoom = 11;
    } else if (maxDistance > 0.02) {
      zoom = 12;
    } else if (maxDistance > 0.01) {
      zoom = 13;
    } else {
      zoom = 14;
    }
  }

  // マーカーを準備
  const markers = eventPositions.map((pos) => ({
    position: pos,
    color: "blue" as const,
  }));

  // 地図スクリーンショットを生成
  let mapImageDataUrl: string | null = null;
  if (eventPositions.length > 0) {
    try {
      mapImageDataUrl = await Promise.race([
        generateMapScreenshot(
          mapCenter,
          zoom,
          1000,
          630,
          markers
        ),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 10000)
        ),
      ]);
    } catch (error) {
      console.error("Failed to generate map screenshot:", error);
      // 地図なしで続行
    }
  }

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to right, #64D8C6 0%, #64D8C6 50%, #bcecd3 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* 地図画像を背景として使用 */}
        {mapImageDataUrl && (
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "80px",
              right: "80px",
              bottom: "60px",
              backgroundColor: "white",
              border: "4px solid #000000",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <img
              src={mapImageDataUrl}
              alt="地図"
              width={1000}
              height={630}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}

        {/* 吹き出し風のテキストボックス（地図の上に重ねる） */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "40px 60px",
            borderRadius: "16px",
            border: "3px solid #000000",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            maxWidth: "800px",
            zIndex: 10,
          }}
        >
          {/* ステータスバッジ */}
          {firstEvent && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 32px",
                borderRadius: "999px",
                fontSize: "32px",
                fontWeight: "bold",
                marginBottom: "40px",
                letterSpacing: "0.08em",
                border: isLive ? "3px solid #16a34a" : "3px solid #f97316",
                backgroundColor: isLive ? "#dcfce7" : "#fff7ed",
                color: isLive ? "#166534" : "#9a3412",
              }}
            >
              {statusText}
            </div>
          )}

          {/* 候補者名（吹き出しに表示） */}
          <div
            style={{
              fontSize: "56px",
              fontWeight: "bold",
              color: "#000000",
              marginBottom: firstEvent ? "32px" : "0",
              textAlign: "center",
            }}
          >
            {candidate.name}
          </div>

          {/* 場所名と時間（最初のイベントがある場合） */}
          {firstEvent && (
            <>
              <div
                style={{
                  fontSize: "36px",
                  color: "#000000",
                  marginTop: "32px",
                  marginBottom: "24px",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                {firstEvent.locationText}
              </div>

              <div
                style={{
                  fontSize: "28px",
                  color: "#000000",
                  textAlign: "center",
                }}
              >
                {dateTimeText}
              </div>
            </>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  const filename = `candidate-${candidate.slug}.png`;
  return await saveOgImage(filename, imageResponse);
}

/**
 * トップページのOGP画像を生成して保存
 */
export async function generateHomeOgImage(): Promise<string> {
  // 地図スクリーンショットを生成（東京エリア全体）
  let mapImageDataUrl: string | null = null;
  try {
    mapImageDataUrl = await Promise.race([
      generateMapScreenshot(
        [35.6812, 139.7671], // 東京駅周辺
        10, // 東京エリア全体が入るズームレベル
        1000,
        630
      ),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      ),
    ]);
  } catch (error) {
    console.error("Failed to generate map screenshot:", error);
    // 地図なしで続行
  }

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to right, #64D8C6 0%, #64D8C6 50%, #bcecd3 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* 地図画像を背景として使用 */}
        {mapImageDataUrl && (
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "80px",
              right: "80px",
              bottom: "60px",
              backgroundColor: "white",
              border: "4px solid #000000",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <img
              src={mapImageDataUrl}
              alt="地図"
              width={1000}
              height={630}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}

        {/* タイトルテキスト（地図の上に重ねる） */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "40px 60px",
            borderRadius: "16px",
            border: "3px solid #000000",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            maxWidth: "800px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: "56px",
              fontWeight: "bold",
              color: "#000000",
              textAlign: "center",
            }}
          >
            チームみらい
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: "#000000",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            街頭演説マップ
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  return await saveOgImage("home.png", imageResponse);
}

/**
 * エリアページのOGP画像を生成して保存
 */
export async function generateAreaOgImage(): Promise<string> {
  // 地図スクリーンショットを生成（関東エリア全体）
  let mapImageDataUrl: string | null = null;
  try {
    mapImageDataUrl = await Promise.race([
      generateMapScreenshot(
        [36.0, 139.5], // 関東エリアの中心
        8, // 関東エリア全体が入るズームレベル
        1000,
        630
      ),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      ),
    ]);
  } catch (error) {
    console.error("Failed to generate map screenshot:", error);
    // 地図なしで続行
  }

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to right, #64D8C6 0%, #64D8C6 50%, #bcecd3 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* 地図画像を背景として使用 */}
        {mapImageDataUrl && (
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "80px",
              right: "80px",
              bottom: "60px",
              backgroundColor: "white",
              border: "4px solid #000000",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <img
              src={mapImageDataUrl}
              alt="地図"
              width={1000}
              height={630}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}

        {/* タイトルテキスト（地図の上に重ねる） */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            padding: "40px 60px",
            borderRadius: "16px",
            border: "3px solid #000000",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            maxWidth: "800px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: "56px",
              fontWeight: "bold",
              color: "#000000",
              textAlign: "center",
            }}
          >
            エリアごと演説予定
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: "#000000",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            チームみらい 街頭演説マップ
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  return await saveOgImage("area.png", imageResponse);
}
