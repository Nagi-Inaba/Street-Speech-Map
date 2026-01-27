"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Copy, Check, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ApiKey {
  id: string;
  name: string;
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiKeysPageClientProps {
  apiKeys: ApiKey[];
}

export default function ApiKeysPageClient({ apiKeys: initialApiKeys }: ApiKeysPageClientProps) {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [newApiKeyRateLimit, setNewApiKeyRateLimit] = useState(100);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const handleCreate = async () => {
    if (!newApiKeyName.trim()) {
      alert("名前を入力してください");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newApiKeyName,
          rateLimit: newApiKeyRateLimit,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewApiKey(data.apiKey);
        // 作成されたAPIキーをリストに追加（apiKeyフィールドは含めない）
        setApiKeys([
          {
            id: data.id,
            name: data.name,
            rateLimit: data.rateLimit,
            isActive: true,
            lastUsedAt: null,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.createdAt),
          },
          ...apiKeys,
        ]);
        setShowCreateDialog(false);
        setShowApiKeyDialog(true);
        setNewApiKeyName("");
        setNewApiKeyRateLimit(100);
        router.refresh();
      } else {
        const error = await res.json();
        alert(error.message || "APIキーの作成に失敗しました");
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      alert("エラーが発生しました");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setApiKeys(apiKeys.filter((key) => key.id !== id));
        router.refresh();
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
      alert("エラーが発生しました");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    setIsUpdating(id);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !currentValue,
        }),
      });

      if (res.ok) {
        setApiKeys(
          apiKeys.map((key) => (key.id === id ? { ...key, isActive: !currentValue } : key))
        );
        router.refresh();
      } else {
        alert("更新に失敗しました");
      }
    } catch (error) {
      console.error("Error updating API key:", error);
      alert("エラーが発生しました");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateRateLimit = async (id: string, rateLimit: number) => {
    if (rateLimit < 1 || rateLimit > 10000) {
      alert("レート制限は1から10000の間で設定してください");
      return;
    }

    setIsUpdating(id);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateLimit,
        }),
      });

      if (res.ok) {
        setApiKeys(apiKeys.map((key) => (key.id === id ? { ...key, rateLimit } : key)));
        router.refresh();
      } else {
        alert("更新に失敗しました");
      }
    } catch (error) {
      console.error("Error updating API key:", error);
      alert("エラーが発生しました");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedId("new");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "未使用";
    return new Date(date).toLocaleString("ja-JP");
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">APIキー管理</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            APIキーが登録されていません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{apiKey.name}</CardTitle>
                    <CardDescription>
                      作成日: {new Date(apiKey.createdAt).toLocaleString("ja-JP")}
                      {apiKey.lastUsedAt && (
                        <> | 最終使用: {formatDate(apiKey.lastUsedAt)}</>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={apiKey.isActive}
                      onCheckedChange={() => handleToggleActive(apiKey.id, apiKey.isActive)}
                      disabled={isUpdating === apiKey.id}
                    />
                    <span className="text-sm text-muted-foreground">
                      {apiKey.isActive ? "有効" : "無効"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Label htmlFor={`rate-limit-${apiKey.id}`} className="w-32">
                      レート制限
                    </Label>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        id={`rate-limit-${apiKey.id}`}
                        type="number"
                        min="1"
                        max="10000"
                        value={apiKey.rateLimit}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value)) {
                            handleUpdateRateLimit(apiKey.id, value);
                          }
                        }}
                        disabled={isUpdating === apiKey.id}
                        className="max-w-32"
                      />
                      <span className="text-sm text-muted-foreground">リクエスト/分</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(apiKey.id, apiKey.name)}
                      disabled={isDeleting === apiKey.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 作成ダイアログ */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいAPIキーを作成</DialogTitle>
            <DialogDescription>
              APIキーの名前とレート制限を設定してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">名前</Label>
              <Input
                id="api-key-name"
                value={newApiKeyName}
                onChange={(e) => setNewApiKeyName(e.target.value)}
                placeholder="例: プロダクション用APIキー"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key-rate-limit">レート制限（1分あたりのリクエスト数）</Label>
              <Input
                id="api-key-rate-limit"
                type="number"
                min="1"
                max="10000"
                value={newApiKeyRateLimit}
                onChange={(e) => setNewApiKeyRateLimit(parseInt(e.target.value) || 100)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "作成中..." : "作成"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* APIキー表示ダイアログ */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>APIキーを作成しました</DialogTitle>
            <DialogDescription>
              このAPIキーは一度だけ表示されます。必ず安全な場所に保存してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>APIキー</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newApiKey || ""}
                  readOnly
                  className="font-mono text-sm"
                  type={visibleKeys.has("new") ? "text" : "password"}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newVisible = new Set(visibleKeys);
                    if (newVisible.has("new")) {
                      newVisible.delete("new");
                    } else {
                      newVisible.add("new");
                    }
                    setVisibleKeys(newVisible);
                  }}
                >
                  {visibleKeys.has("new") ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => newApiKey && handleCopyApiKey(newApiKey)}
                >
                  {copiedId === "new" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
              <strong>重要:</strong> このAPIキーは二度と表示されません。必ずコピーして安全な場所に保存してください。
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowApiKeyDialog(false)}>閉じる</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
