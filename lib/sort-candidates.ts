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
 * 地域ブロックの順序に基づいて候補者をソートする関数
 * 北海道、東北、関東、東海、北陸、近畿、中国地方、四国、九州・沖縄の順に並べます
 * 同じ地域ブロック内では都道府県の順序で並べます
 */
export function sortCandidatesByRegion<T extends { prefecture: string | null; region: string | null }>(
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

    // 地域ブロックでソート
    if (finalRegionA && finalRegionB) {
      const indexA = REGION_ORDER.indexOf(finalRegionA as typeof REGION_ORDER[number]);
      const indexB = REGION_ORDER.indexOf(finalRegionB as typeof REGION_ORDER[number]);
      if (indexA !== -1 && indexB !== -1) {
        // 同じ地域ブロック内の場合、都道府県の順序でソート
        if (indexA === indexB) {
          // prefectureがある場合、都道府県の順序でソート
          if (a.prefecture && b.prefecture) {
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
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }

    // 片方だけ地域ブロックがある場合、地域ブロックがある方を前に
    if (finalRegionA && !finalRegionB) return -1;
    if (!finalRegionA && finalRegionB) return 1;

    // 同じ地域ブロック内で、prefectureがある方を前に
    if (a.prefecture && !b.prefecture) return -1;
    if (!a.prefecture && b.prefecture) return 1;

    // どちらもない場合は元の順序を維持
    return 0;
  });
}