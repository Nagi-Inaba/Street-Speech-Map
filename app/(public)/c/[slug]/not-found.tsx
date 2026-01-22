import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-8">候補者が見つかりませんでした</p>
        <Link href="/">
          <Button>候補者一覧に戻る</Button>
        </Link>
      </div>
    </div>
  );
}

