import { redirect } from "next/navigation";

/**
 * 候補者一覧はダッシュボードに統合済み。このURLはダッシュボードの候補者セクションへリダイレクトする。
 */
export default function CandidatesPage() {
  redirect("/admin#candidates");
}
