// 都道府県と比例代表ブロックの順序に基づいて候補者をソートする関数
export function sortCandidatesByRegion<T extends { prefecture: string | null; region: string | null }>(
  candidates: T[]
): T[] {
  return [...candidates].sort((a, b) => {
    // prefectureが存在する場合、都道府県の順序でソート
    if (a.prefecture && b.prefecture) {
      const indexA = PREFECTURES.indexOf(a.prefecture as Prefecture);
      const indexB = PREFECTURES.indexOf(b.prefecture as Prefecture);
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }
    
    // 片方だけprefectureがある場合、prefectureがある方を前に
    if (a.prefecture && !b.prefecture) return -1;
    if (!a.prefecture && b.prefecture) return 1;
    
    // regionが存在する場合、比例代表ブロックの順序でソート
    if (a.region && b.region) {
      const indexA = PROPORTIONAL_BLOCKS.indexOf(a.region as ProportionalBlock);
      const indexB = PROPORTIONAL_BLOCKS.indexOf(b.region as ProportionalBlock);
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }
    
    // 片方だけregionがある場合、regionがある方を前に
    if (a.region && !b.region) return -1;
    if (!a.region && b.region) return 1;
    
    // どちらもない場合は元の順序を維持
    return 0;
  });
}
