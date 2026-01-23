/**
 * 都道府県リスト（47都道府県）
 */
export const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const;

export type Prefecture = typeof PREFECTURES[number];

/**
 * 候補者タイプ
 */
export const CANDIDATE_TYPES = {
  SINGLE: "SINGLE", // 小選挙区
  PROPORTIONAL: "PROPORTIONAL", // 比例
} as const;

export type CandidateType = typeof CANDIDATE_TYPES[keyof typeof CANDIDATE_TYPES];

/**
 * 比例代表ブロック（11ブロック）
 */
export const PROPORTIONAL_BLOCKS = [
  "北海道ブロック",
  "東北ブロック",
  "北関東ブロック",
  "南関東ブロック",
  "東京ブロック",
  "北陸信越ブロック",
  "東海ブロック",
  "近畿ブロック",
  "中国ブロック",
  "四国ブロック",
  "九州ブロック",
] as const;

export type ProportionalBlock = typeof PROPORTIONAL_BLOCKS[number];

/**
 * 小選挙区データの型
 */
export interface SingleDistrict {
  prefecture: string;
  districtNumber: number;
  districtName: string;
}

/**
 * 小選挙区データ（都道府県ごとにグループ化）
 * CSVファイルから読み込む場合は、このデータを更新する
 */
export const SINGLE_DISTRICTS: Record<string, SingleDistrict[]> = {
  "北海道": [
    { prefecture: "北海道", districtNumber: 1, districtName: "北海道第1区" },
    { prefecture: "北海道", districtNumber: 2, districtName: "北海道第2区" },
    { prefecture: "北海道", districtNumber: 3, districtName: "北海道第3区" },
    { prefecture: "北海道", districtNumber: 4, districtName: "北海道第4区" },
    { prefecture: "北海道", districtNumber: 5, districtName: "北海道第5区" },
    { prefecture: "北海道", districtNumber: 6, districtName: "北海道第6区" },
    { prefecture: "北海道", districtNumber: 7, districtName: "北海道第7区" },
    { prefecture: "北海道", districtNumber: 8, districtName: "北海道第8区" },
    { prefecture: "北海道", districtNumber: 9, districtName: "北海道第9区" },
    { prefecture: "北海道", districtNumber: 10, districtName: "北海道第10区" },
    { prefecture: "北海道", districtNumber: 11, districtName: "北海道第11区" },
    { prefecture: "北海道", districtNumber: 12, districtName: "北海道第12区" },
  ],
  // 他の都道府県はCSVファイルから読み込むか、必要に応じて追加
};

/**
 * 都道府県の小選挙区リストを取得
 */
export function getSingleDistricts(prefecture: string | null | undefined): SingleDistrict[] {
  if (!prefecture) return [];
  return SINGLE_DISTRICTS[prefecture] || [];
}

/**
 * 都道府県の中心座標（県庁所在地を基準）
 */
export const PREFECTURE_COORDINATES: Record<string, [number, number]> = {
  "北海道": [43.0642, 141.3469], // 札幌市
  "青森県": [40.8244, 140.7406], // 青森市
  "岩手県": [39.7036, 141.1527], // 盛岡市
  "宮城県": [38.2682, 140.8694], // 仙台市
  "秋田県": [39.7186, 140.1024], // 秋田市
  "山形県": [38.2404, 140.3633], // 山形市
  "福島県": [37.7503, 140.4676], // 福島市
  "茨城県": [36.3414, 140.4467], // 水戸市
  "栃木県": [36.5658, 139.8836], // 宇都宮市
  "群馬県": [36.3911, 139.0608], // 前橋市
  "埼玉県": [35.8574, 139.6489], // さいたま市
  "千葉県": [35.6074, 140.1065], // 千葉市
  "東京都": [35.6895, 139.6917], // 新宿区
  "神奈川県": [35.4475, 139.6425], // 横浜市
  "新潟県": [37.9022, 139.0236], // 新潟市
  "富山県": [36.6953, 137.2113], // 富山市
  "石川県": [36.5947, 136.6256], // 金沢市
  "福井県": [36.0652, 136.2216], // 福井市
  "山梨県": [35.6636, 138.5683], // 甲府市
  "長野県": [36.6513, 138.1809], // 長野市
  "岐阜県": [35.3912, 136.7223], // 岐阜市
  "静岡県": [34.9769, 138.3831], // 静岡市
  "愛知県": [35.1802, 136.9066], // 名古屋市
  "三重県": [34.7303, 136.5086], // 津市
  "滋賀県": [35.0045, 135.8686], // 大津市
  "京都府": [35.0214, 135.7556], // 京都市
  "大阪府": [34.6863, 135.5197], // 大阪市
  "兵庫県": [34.6913, 135.1830], // 神戸市
  "奈良県": [34.6851, 135.8327], // 奈良市
  "和歌山県": [34.2261, 135.1675], // 和歌山市
  "鳥取県": [35.5039, 134.2377], // 鳥取市
  "島根県": [35.4723, 133.0506], // 松江市
  "岡山県": [34.6617, 133.9350], // 岡山市
  "広島県": [34.3964, 132.4596], // 広島市
  "山口県": [34.1858, 131.4706], // 山口市
  "徳島県": [34.0658, 134.5593], // 徳島市
  "香川県": [34.3401, 134.0433], // 高松市
  "愛媛県": [33.8416, 132.7657], // 松山市
  "高知県": [33.5597, 133.5311], // 高知市
  "福岡県": [33.6063, 130.4181], // 福岡市
  "佐賀県": [33.2494, 130.2988], // 佐賀市
  "長崎県": [32.7448, 129.8737], // 長崎市
  "熊本県": [32.7898, 130.7416], // 熊本市
  "大分県": [33.2382, 131.6126], // 大分市
  "宮崎県": [31.9077, 131.4202], // 宮崎市
  "鹿児島県": [31.5601, 130.5571], // 鹿児島市
  "沖縄県": [26.2124, 127.6809], // 那覇市
};

/**
 * 都道府県名から座標を取得
 */
export function getPrefectureCoordinates(prefecture: string | null | undefined): [number, number] | null {
  if (!prefecture) return null;
  return PREFECTURE_COORDINATES[prefecture] || null;
}
