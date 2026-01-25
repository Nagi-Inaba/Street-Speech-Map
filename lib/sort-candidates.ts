import { PREFECTURES, PROPORTIONAL_BLOCKS, type Prefecture, type ProportionalBlock } from "./constants";

/**
 * 都道府県の順序（PREFECTURESの順序に基づく）
 */
const PREFECTURE_ORDER = PREFECTURES;

/**
 * 地域ブロックの順序（北から南）
 */
const REGION_ORDER = [
  "北海道",
  "東北",
  "関東",
  "東海",
  "北陸",
  "近畿",
  "中国地方",
  "四国",
  "九州・沖縄",
] as const;

/**
 * 都道府県を地域ブロックに分類
 */
function getRegionBlock(prefecture: string | null): string | null {
  if (!prefecture) return null;

  // 北海道
  if (prefecture === "北海道") return "北海道";

  // 東北
  if (["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"].includes(prefecture)) {
    return "東北";
  }

  // 関東
  if (["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"].includes(prefecture)) {
    return "関東";
  }

  // 東海
  if (["山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県"].includes(prefecture)) {
    return "東海";
  }

  // 北陸
  if (["新潟県", "富山県", "石川県", "福井県"].includes(prefecture)) {
    return "北陸";
  }

  // 近畿
  if (["滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"].includes(prefecture)) {
    return "近畿";
  }

  // 中国地方
  if (["鳥取県", "島根県", "岡山県", "広島県", "山口県"].includes(prefecture)) {
    return "中国地方";
  }

  // 四国
  if (["徳島県", "香川県", "愛媛県", "高知県"].includes(prefecture)) {
    return "四国";
  }

  // 九州・沖縄
  if (["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"].includes(prefecture)) {
    return "九州・沖縄";
  }

  return null;
}

/**
 * 比例代表ブロックを地域ブロックに変換
 */
function convertProportionalBlockToRegion(block: string | null): string | null {
  if (!block) return null;

  const blockMap: Record<string, string> = {
    "北海道ブロック": "北海道",
    "東北ブロック": "東北",
    "北関東ブロック": "関東",
    "南関東ブロック": "関東",
    "東京ブロック": "関東",
    "北陸信越ブロック": "北陸",
    "東海ブロック": "東海",
    "近畿ブロック": "近畿",
    "中国ブロック": "中国地方",
    "四国ブロック": "四国",
    "九州ブロック": "九州・沖縄",
  };

  return blockMap[block] || null;
}

/**
 * 比例ブロックと都道府県の対応関係に基づくソート順序を取得
 * 関東ブロックの場合: 北関東 → 南関東 → 千葉・神奈川 → 東京比例 → 東京小選挙区
 */
function getSortOrderForRegion(
  region: string,
  isProportional: boolean,
  proportionalBlock: string | null,
  prefecture: string | null
): number {
  if (region === "関東") {
    if (isProportional) {
      // 比例代表の場合
      if (proportionalBlock === "北関東ブロック") return 1;
      if (proportionalBlock === "南関東ブロック") return 2;
      if (proportionalBlock === "東京ブロック") return 5;
      return 10; // その他の比例ブロック
    } else {
      // 小選挙区の場合
      if (prefecture === "千葉県") return 3;
      if (prefecture === "神奈川県") return 4;
      if (prefecture === "東京都") return 6;
      // その他の関東の都道府県（茨城、栃木、群馬、埼玉）は比例ブロックの後に
      if (prefecture === "茨城県") return 7;
      if (prefecture === "栃木県") return 8;
      if (prefecture === "群馬県") return 9;
      if (prefecture === "埼玉県") return 10;
      return 11;
    }
  }
  
  // その他の地域ブロックの場合は、比例を先に
  if (isProportional) {
    const blockOrder = getProportionalBlockOrder(proportionalBlock);
    return blockOrder * 10; // 比例を先に
  } else {
    // 小選挙区は比例の後に
    if (prefecture) {
      const prefIndex = PREFECTURE_ORDER.indexOf(prefecture as Prefecture);
      return prefIndex !== -1 ? 1000 + prefIndex : 2000;
    }
    return 3000;
  }
}


/**
 * 比例代表ブロックの順序を取得（PROPORTIONAL_BLOCKSの順序に基づく）
 */
function getProportionalBlockOrder(block: string | null): number {
  if (!block) return Infinity;
  const index = PROPORTIONAL_BLOCKS.indexOf(block as ProportionalBlock);
  return index === -1 ? Infinity : index;
}

/**
 * 候補者が比例代表かどうかを判定
 */
function isProportional(candidate: { type?: string | null; region?: string | null }): boolean {
  return candidate.type === "PROPORTIONAL" || 
         (candidate.region !== null && PROPORTIONAL_BLOCKS.includes(candidate.region as ProportionalBlock));
}

/**
 * 地域ブロックの順序に基づいて候補者をソートする関数
 * 北海道、東北、関東、東海、北陸、近畿、中国地方、四国、九州・沖縄の順に並べます
 * 同じ地域ブロック内では、比例代表を先に、その後小選挙区を表示します
 * 比例代表は比例ブロックの順序、小選挙区は都道府県の順序で並べます
 */
export function sortCandidatesByRegion<T extends { type?: string | null; prefecture: string | null; region: string | null }>(
  candidates: T[]
): T[] {
  return [...candidates].sort((a, b) => {

    // prefectureから地域ブロックを取得
    const regionA = a.prefecture ? getRegionBlock(a.prefecture) : null;
    const regionB = b.prefecture ? getRegionBlock(b.prefecture) : null;

    // regionから地域ブロックを取得（比例代表ブロックの場合）
    const regionFromBlockA = a.region ? convertProportionalBlockToRegion(a.region) : null;
    const regionFromBlockB = b.region ? convertProportionalBlockToRegion(b.region) : null;

    // 優先順位: prefectureの地域ブロック > regionの地域ブロック
    const finalRegionA = regionA || regionFromBlockA;
    const finalRegionB = regionB || regionFromBlockB;

    // 比例代表かどうかを判定
    const isPropA = isProportional(a);
    const isPropB = isProportional(b);

    // 地域ブロックでソート
    if (finalRegionA && finalRegionB) {
      const indexA = REGION_ORDER.indexOf(finalRegionA as typeof REGION_ORDER[number]);
      const indexB = REGION_ORDER.indexOf(finalRegionB as typeof REGION_ORDER[number]);
      if (indexA !== -1 && indexB !== -1) {
        // 同じ地域ブロック内の場合
        if (indexA === indexB) {
          // 関東ブロックの場合は特別な順序を使用
          if (finalRegionA === "関東") {
            const orderA = getSortOrderForRegion(finalRegionA, isPropA, a.region, a.prefecture);
            const orderB = getSortOrderForRegion(finalRegionB, isPropB, b.region, b.prefecture);
            
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            
            // 同じ順序内での細かいソート
            // 比例代表の場合、比例ブロックの順序で
            if (isPropA && isPropB) {
              const blockOrderA = getProportionalBlockOrder(a.region);
              const blockOrderB = getProportionalBlockOrder(b.region);
              if (blockOrderA !== Infinity && blockOrderB !== Infinity && blockOrderA !== blockOrderB) {
                return blockOrderA - blockOrderB;
              }
            }
            
            // 小選挙区の場合、同じ都道府県内では選挙区番号で
            if (!isPropA && !isPropB && a.prefecture && b.prefecture) {
              const prefIndexA = PREFECTURE_ORDER.indexOf(a.prefecture as Prefecture);
              const prefIndexB = PREFECTURE_ORDER.indexOf(b.prefecture as Prefecture);
              if (prefIndexA === prefIndexB && a.region && b.region) {
                const extractDistrictNumber = (region: string): number => {
                  const match = region.match(/第(\d+)区/);
                  return match ? parseInt(match[1], 10) : 0;
                };
                const districtNumA = extractDistrictNumber(a.region);
                const districtNumB = extractDistrictNumber(b.region);
                if (districtNumA > 0 && districtNumB > 0) {
                  return districtNumA - districtNumB;
                }
              }
            }
          } else {
            // その他の地域ブロックの場合は、比例代表を先に
            if (isPropA && !isPropB) return -1;
            if (!isPropA && isPropB) return 1;

            // 両方とも比例代表の場合、比例ブロックの順序でソート
            if (isPropA && isPropB) {
              const blockOrderA = getProportionalBlockOrder(a.region);
              const blockOrderB = getProportionalBlockOrder(b.region);
              if (blockOrderA !== Infinity && blockOrderB !== Infinity) {
                return blockOrderA - blockOrderB;
              }
              // ブロック順序が取得できない場合はregionで比較
              if (a.region && b.region) {
                return a.region.localeCompare(b.region);
              }
            }

            // 両方とも小選挙区の場合、都道府県の順序でソート
            if (!isPropA && !isPropB && a.prefecture && b.prefecture) {
              const prefIndexA = PREFECTURE_ORDER.indexOf(a.prefecture as Prefecture);
              const prefIndexB = PREFECTURE_ORDER.indexOf(b.prefecture as Prefecture);
              if (prefIndexA !== -1 && prefIndexB !== -1) {
                // 同じ都道府県内の場合、region（選挙区）でソート
                if (prefIndexA === prefIndexB && a.region && b.region) {
                  // 選挙区番号を抽出（例: "東京都第1区" -> 1）
                  const extractDistrictNumber = (region: string): number => {
                    const match = region.match(/第(\d+)区/);
                    return match ? parseInt(match[1], 10) : 0;
                  };
                  const districtNumA = extractDistrictNumber(a.region);
                  const districtNumB = extractDistrictNumber(b.region);
                  if (districtNumA > 0 && districtNumB > 0) {
                    return districtNumA - districtNumB;
                  }
                }
                return prefIndexA - prefIndexB;
              }
            }

            // prefectureがある方を前に
            if (a.prefecture && !b.prefecture) return -1;
            if (!a.prefecture && b.prefecture) return 1;
          }
        }
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }

    // 片方だけ地域ブロックがある場合、地域ブロックがある方を前に
    if (finalRegionA && !finalRegionB) return -1;
    if (!finalRegionA && finalRegionB) return 1;

    // 比例代表を先に
    if (isPropA && !isPropB) return -1;
    if (!isPropA && isPropB) return 1;

    // 同じ地域ブロック内で、prefectureがある方を前に
    if (a.prefecture && !b.prefecture) return -1;
    if (!a.prefecture && b.prefecture) return 1;

    // どちらもない場合は元の順序を維持
    return 0;
  });
}