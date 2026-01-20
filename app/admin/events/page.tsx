import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJST } from "@/lib/time";

export default async function EventsPage() {
  const events = await prisma.speechEvent.findMany({
    include: {
      candidate: true,
    },
    orderBy: [
      { startAt: "asc" },
      { createdAt: "desc" },
    ],
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">イベント管理</h1>
        <Link href="/admin/events/new">
          <Button>新規作成</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{event.candidate.name} - {event.locationText}</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  event.status === "LIVE" ? "bg-red-100 text-red-800" :
                  event.status === "ENDED" ? "bg-gray-100 text-gray-800" :
                  "bg-blue-100 text-blue-800"
                }`}>
                  {event.status === "PLANNED" ? "予定" :
                   event.status === "LIVE" ? "実施中" : "終了"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                開始: {event.startAt ? formatJST(event.startAt) : "未定"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                終了: {event.endAt ? formatJST(event.endAt) : "未定"}
              </p>
              <div className="flex gap-2">
                <Link href={`/admin/events/${event.id}/edit`}>
                  <Button variant="outline" size="sm">
                    編集
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <p className="text-muted-foreground">イベントが登録されていません。</p>
      )}
    </div>
  );
}
