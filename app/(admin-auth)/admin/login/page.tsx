"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        userId,
        password,
        redirect: false,
      });

      console.log("Login result:", result);

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setError("IDまたはパスワードが正しくありません");
        } else {
          setError(`ログインに失敗しました: ${result.error}`);
        }
      } else if (result?.ok) {
        // ログイン成功
        router.push("/admin");
        router.refresh(); // ページを強制的にリフレッシュ
      } else {
        setError("ログインに失敗しました（不明なエラー）");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("ログイン中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>管理画面ログイン</CardTitle>
          <CardDescription>街頭演説マップ管理画面</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium mb-1">
                ID（数字）
              </label>
              <input
                id="userId"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={userId}
                onChange={(e) => {
                  // 数字のみを許可
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  setUserId(value);
                }}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-md bg-white disabled:opacity-50"
                placeholder="123456"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                パスワード（半角英数）
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  // 半角英数のみを許可
                  const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                  setPassword(value);
                }}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-md bg-white disabled:opacity-50"
                placeholder="パスワードを入力"
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
