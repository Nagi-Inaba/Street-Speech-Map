"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Candidate {
  id: string;
  slug: string;
  name: string;
  type: string;
  prefecture: string | null;
  region: string | null;
}

interface CandidatesPageClientProps {
  candidates: Candidate[];
}

export default function CandidatesPageClient({ candidates: initialCandidates }: CandidatesPageClientProps) {
  const [sortBy, setSortBy] = useState<"name" | "type" | "prefecture">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const sortedCandidates = useMemo(() => {
    const sorted = [...initialCandidates].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ja");
          break;
        case "type":
          // 小選挙区を先に表示（SINGLE < PROPORTIONAL）
          if (a.type === "SINGLE" && b.type === "PROPORTIONAL") {
            comparison = -1;
          } else if (a.type === "PROPORTIONAL" && b.type === "SINGLE") {
            comparison = 1;
          } else {
            comparison = a.type.localeCompare(b.type);
          }
          break;
        case "prefecture":
          const aPref = a.prefecture || "";
          const bPref = b.prefecture || "";
          comparison = aPref.localeCompare(bPref, "ja");
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [initialCandidates, sortBy, sortOrder]);

  const handleSort = (field: "name" | "type" | "prefecture") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">候補者管理</h1>
        <Link href="/admin/candidates/new">
          <Button>追加</Button>
        </Link>
      </div>

      {/* 並べ替えコントロール */}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-sm font-medium">並べ替え:</span>
        <div className="flex gap-2">
          <Button
            variant={sortBy === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("name")}
          >
            名前 {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
          <Button
            variant={sortBy === "type" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("type")}
          >
            立候補種別 {sortBy === "type" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
          <Button
            variant={sortBy === "prefecture" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("prefecture")}
          >
            都道府県 {sortBy === "prefecture" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCandidates.map((candidate) => (
          <Card key={candidate.id}>
            <CardHeader>
              <CardTitle>{candidate.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-1">
                <p className="text-sm text-muted-foreground">
                  Slug: {candidate.slug}
                </p>
                <p className="text-sm font-medium">
                  タイプ: {candidate.type === "SINGLE" ? "小選挙区" : "比例"}
                </p>
                {candidate.prefecture && (
                  <p className="text-sm text-muted-foreground">
                    都道府県: {candidate.prefecture}
                  </p>
                )}
                {candidate.region && (
                  <p className="text-sm text-muted-foreground">
                    地域: {candidate.region}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/candidates/${candidate.id}/edit`}>
                  <Button variant="outline" size="sm">
                    編集
                  </Button>
                </Link>
                <Link href={`/c/${candidate.slug}`}>
                  <Button variant="outline" size="sm">
                    公開ページ
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedCandidates.length === 0 && (
        <p className="text-muted-foreground">候補者が登録されていません。</p>
      )}
    </div>
  );
}

