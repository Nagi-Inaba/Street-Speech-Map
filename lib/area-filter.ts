import { PREFECTURES } from "./constants";

/**
 * 都道府県 → 比例代表ブロック の対応
 * 一つの県を選択したとき、その県の小選挙区＋当該比例ブロックの候補を表示するために使用
 */
export const PREFECTURE_TO_PROP_BLOCK: Record<string, string> = {
  "北海道": "北海道ブロック",
  "青森県": "東北ブロック",
  "岩手県": "東北ブロック",
  "宮城県": "東北ブロック",
  "秋田県": "東北ブロック",
  "山形県": "東北ブロック",
  "福島県": "東北ブロック",
  "茨城県": "北関東ブロック",
  "栃木県": "北関東ブロック",
  "群馬県": "北関東ブロック",
  "埼玉県": "南関東ブロック",
  "千葉県": "南関東ブロック",
  "東京都": "東京ブロック",
  "神奈川県": "南関東ブロック",
  "新潟県": "北陸信越ブロック",
  "富山県": "北陸信越ブロック",
  "石川県": "北陸信越ブロック",
  "福井県": "北陸信越ブロック",
  "長野県": "北陸信越ブロック",
  "山梨県": "東海ブロック",
  "岐阜県": "東海ブロック",
  "静岡県": "東海ブロック",
  "愛知県": "東海ブロック",
  "三重県": "東海ブロック",
  "滋賀県": "近畿ブロック",
  "京都府": "近畿ブロック",
  "大阪府": "近畿ブロック",
  "兵庫県": "近畿ブロック",
  "奈良県": "近畿ブロック",
  "和歌山県": "近畿ブロック",
  "鳥取県": "中国ブロック",
  "島根県": "中国ブロック",
  "岡山県": "中国ブロック",
  "広島県": "中国ブロック",
  "山口県": "中国ブロック",
  "徳島県": "四国ブロック",
  "香川県": "四国ブロック",
  "愛媛県": "四国ブロック",
  "高知県": "四国ブロック",
  "福岡県": "九州ブロック",
  "佐賀県": "九州ブロック",
  "長崎県": "九州ブロック",
  "熊本県": "九州ブロック",
  "大分県": "九州ブロック",
  "宮崎県": "九州ブロック",
  "鹿児島県": "九州ブロック",
  "沖縄県": "九州ブロック",
};

/** 地域ブロック定義: ブロックID → { ラベル, 都道府県リスト, 比例ブロックリスト } */
export const REGION_BLOCK_DEFS: Record<
  string,
  { label: string; prefectures: string[]; proportionalBlocks: string[] }
> = {
  "北海道": {
    label: "北海道",
    prefectures: ["北海道"],
    proportionalBlocks: ["北海道ブロック"],
  },
  "東北": {
    label: "東北",
    prefectures: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
    proportionalBlocks: ["東北ブロック"],
  },
  "関東": {
    label: "関東（茨城・栃木・群馬・埼玉・千葉・神奈川）",
    prefectures: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "神奈川県"],
    proportionalBlocks: ["北関東ブロック", "南関東ブロック"],
  },
  "東京": {
    label: "東京",
    prefectures: ["東京都"],
    proportionalBlocks: ["東京ブロック"],
  },
  "北陸信越": {
    label: "北陸信越",
    prefectures: ["新潟県", "富山県", "石川県", "福井県", "長野県"],
    proportionalBlocks: ["北陸信越ブロック"],
  },
  "東海": {
    label: "東海",
    prefectures: ["山梨県", "岐阜県", "静岡県", "愛知県", "三重県"],
    proportionalBlocks: ["東海ブロック"],
  },
  "近畿": {
    label: "近畿",
    prefectures: ["滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
    proportionalBlocks: ["近畿ブロック"],
  },
  "中国": {
    label: "中国",
    prefectures: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
    proportionalBlocks: ["中国ブロック"],
  },
  "四国": {
    label: "四国",
    prefectures: ["徳島県", "香川県", "愛媛県", "高知県"],
    proportionalBlocks: ["四国ブロック"],
  },
  "九州・沖縄": {
    label: "九州・沖縄",
    prefectures: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"],
    proportionalBlocks: ["九州ブロック"],
  },
};

export interface AreaFilterOption {
  id: string;
  label: string;
  group: "all" | "block" | "prefecture";
}

/** フィルター用のエリア選択肢一覧 */
export function getAreaFilterOptions(): AreaFilterOption[] {
  const opts: AreaFilterOption[] = [
    { id: "all", label: "すべてのエリア", group: "all" },
  ];

  // 地域ブロック（東京を関東から独立）
  const blockOrder = [
    "北海道",
    "東北",
    "関東",
    "東京",
    "北陸信越",
    "東海",
    "近畿",
    "中国",
    "四国",
    "九州・沖縄",
  ] as const;
  blockOrder.forEach((id) => {
    const def = REGION_BLOCK_DEFS[id];
    if (def) opts.push({ id: `block:${id}`, label: def.label, group: "block" });
  });

  // 都道府県（一県選択時: その県の小選挙区＋当該比例ブロック）
  PREFECTURES.forEach((p) => {
    opts.push({ id: `pref:${p}`, label: p, group: "prefecture" });
  });

  return opts;
}

export interface CandidateForArea {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  prefecture: string | null;
  region: string | null;
  showEvents: boolean;
}

/**
 * 候補者が指定エリアに該当するか判定する
 * - areaId "all": 全て（呼び出し側で可視候補のみに絞る前提）
 * - areaId "block:東京": 東京都の小選挙区 または 東京ブロックの比例。党首は全エリアに含める
 * - areaId "block:北陸信越": 北陸信越の県の小選挙区 または 北陸信越ブロックの比例
 * - areaId "pref:福井県": 福井県の小選挙区 または 北陸信越ブロックの比例
 */
export function candidateMatchesArea(candidate: CandidateForArea, areaId: string): boolean {
  // 党首は全エリアに表示
  if (candidate.type === "PARTY_LEADER") return true;

  if (areaId === "all") return true;

  if (areaId.startsWith("block:")) {
    const blockKey = areaId.slice(6);
    const def = REGION_BLOCK_DEFS[blockKey];
    if (!def) return false;

    // 小選挙区・応援: prefecture がブロックの県に含まれるか
    if (candidate.prefecture && def.prefectures.includes(candidate.prefecture)) return true;

    // 比例: region がブロックの比例ブロックに含まれるか
    if (candidate.type === "PROPORTIONAL" && candidate.region && def.proportionalBlocks.includes(candidate.region))
      return true;

    // 応援弁士で prefecture が合致
    if (candidate.type === "SUPPORT" && candidate.prefecture && def.prefectures.includes(candidate.prefecture))
      return true;

    return false;
  }

  if (areaId.startsWith("pref:")) {
    const prefecture = areaId.slice(5);
    const propBlock = PREFECTURE_TO_PROP_BLOCK[prefecture];
    if (!propBlock) return false;

    // 小選挙区・応援: その県
    if (candidate.prefecture === prefecture) return true;

    // 比例: その県が属する比例ブロック
    if (candidate.type === "PROPORTIONAL" && candidate.region === propBlock) return true;

    return false;
  }

  return false;
}
