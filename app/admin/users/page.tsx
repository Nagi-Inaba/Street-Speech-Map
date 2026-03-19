"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, KeyRound, Pencil, Copy, Check } from "lucide-react";

interface User {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  role: string;
  region: string | null;
  createdAt: string;
}

interface CreatedUser extends User {
  generatedPassword: string;
}

const ROLE_LABELS: Record<string, string> = {
  SiteAdmin: "サイト管理者",
  SiteStaff: "サイトスタッフ",
  PartyAdmin: "党管理者",
  RegionEditor: "地域編集者",
};

const ROLE_COLORS: Record<string, string> = {
  SiteAdmin: "bg-red-100 text-red-800",
  SiteStaff: "bg-blue-100 text-blue-800",
  PartyAdmin: "bg-green-100 text-green-800",
  RegionEditor: "bg-yellow-100 text-yellow-800",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("SiteStaff");
  const [newRegion, setNewRegion] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editRegion, setEditRegion] = useState("");

  const submittingRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCreate = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          role: newRole,
          region: newRegion || null,
        }),
      });

      if (res.ok) {
        const data: CreatedUser = await res.json();
        setCreatedUser(data);
        setShowCreateDialog(false);
        setShowCredentialsDialog(true);
        setNewName("");
        setNewRole("SiteStaff");
        setNewRegion("");
        fetchUsers();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(
          `作成に失敗しました: ${
            typeof errorData.error === "string"
              ? errorData.error
              : "不明なエラー"
          }`
        );
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("エラーが発生しました");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          region: editRegion || null,
        }),
      });

      if (res.ok) {
        setShowEditDialog(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(
          `更新に失敗しました: ${
            typeof errorData.error === "string"
              ? errorData.error
              : "不明なエラー"
          }`
        );
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("エラーが発生しました");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(
          `削除に失敗しました: ${
            typeof errorData.error === "string"
              ? errorData.error
              : "不明なエラー"
          }`
        );
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("エラーが発生しました");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password" }),
      });

      if (res.ok) {
        const data = await res.json();
        setResetPassword(data.newPassword);
      } else {
        alert("パスワードリセットに失敗しました");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("エラーが発生しました");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name || "");
    setEditRole(user.role);
    setEditRegion(user.region || "");
    setShowEditDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">ユーザー管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理ユーザーの追加・編集・削除
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          新しいユーザーを追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>登録済みユーザー</CardTitle>
          <CardDescription>{users.length}名のユーザー</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ユーザーが登録されていません
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>権限</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      地域
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      作成日
                    </TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {user.userId || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                            ROLE_COLORS[user.role] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {user.region || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(user)}
                            title="編集"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedUser(user);
                              setResetPassword(null);
                              setShowResetPasswordDialog(true);
                            }}
                            title="パスワードリセット"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteConfirm(true);
                            }}
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいユーザーを追加</DialogTitle>
            <DialogDescription>
              IDとパスワードは自動生成されます。作成後に表示される情報を必ずメモしてください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">名前 *</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: 田中太郎"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">権限 *</Label>
              <select
                id="new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white min-h-[44px]"
              >
                <option value="SiteAdmin">サイト管理者（全権限）</option>
                <option value="SiteStaff">
                  サイトスタッフ（候補者・イベント管理）
                </option>
                <option value="PartyAdmin">党管理者（候補者・イベント管理）</option>
                <option value="RegionEditor">
                  地域編集者（担当地域のみ）
                </option>
              </select>
            </div>
            {newRole === "RegionEditor" && (
              <div className="space-y-2">
                <Label htmlFor="new-region">担当地域</Label>
                <Input
                  id="new-region"
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  placeholder="例: 東京都"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSubmitting || !newName.trim()}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                作成
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Dialog */}
      <Dialog
        open={showCredentialsDialog}
        onOpenChange={setShowCredentialsDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー作成完了</DialogTitle>
            <DialogDescription>
              以下のログイン情報を必ず安全な場所に保存してください。パスワードは再表示できません。
            </DialogDescription>
          </DialogHeader>
          {createdUser && (
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 font-medium">名前</p>
                    <p className="text-sm font-medium">{createdUser.name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 font-medium">
                      ログインID
                    </p>
                    <p className="text-lg font-mono font-bold">
                      {createdUser.userId}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(createdUser.userId || "", "userId")
                    }
                  >
                    {copiedField === "userId" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 font-medium">
                      パスワード
                    </p>
                    <p className="text-lg font-mono font-bold">
                      {createdUser.generatedPassword}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(createdUser.generatedPassword, "password")
                    }
                  >
                    {copiedField === "password" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div>
                  <p className="text-xs text-amber-700 font-medium">権限</p>
                  <p className="text-sm">
                    {ROLE_LABELS[createdUser.role] || createdUser.role}
                  </p>
                </div>
              </div>
              <p className="text-xs text-red-600 font-medium">
                このダイアログを閉じるとパスワードは二度と表示されません。
              </p>
              <div className="flex justify-end">
                <Button onClick={() => setShowCredentialsDialog(false)}>
                  確認しました
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー編集</DialogTitle>
            <DialogDescription>
              ユーザーの名前・権限を変更します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">名前</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">権限</Label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white min-h-[44px]"
              >
                <option value="SiteAdmin">サイト管理者（全権限）</option>
                <option value="SiteStaff">
                  サイトスタッフ（候補者・イベント管理）
                </option>
                <option value="PartyAdmin">党管理者（候補者・イベント管理）</option>
                <option value="RegionEditor">
                  地域編集者（担当地域のみ）
                </option>
              </select>
            </div>
            {editRole === "RegionEditor" && (
              <div className="space-y-2">
                <Label htmlFor="edit-region">担当地域</Label>
                <Input
                  id="edit-region"
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  placeholder="例: 東京都"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleEdit}
                disabled={isSubmitting || !editName.trim()}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー削除の確認</DialogTitle>
            <DialogDescription>
              {selectedUser?.name || selectedUser?.userId}
              を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={showResetPasswordDialog}
        onOpenChange={(open) => {
          setShowResetPasswordDialog(open);
          if (!open) setResetPassword(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワードリセット</DialogTitle>
            <DialogDescription>
              {selectedUser?.name || selectedUser?.userId}
              のパスワードをリセットします。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {resetPassword ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-amber-800">
                  新しいパスワード:
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-mono font-bold">
                    {resetPassword}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(resetPassword, "resetPassword")
                    }
                  >
                    {copiedField === "resetPassword" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-red-600 font-medium">
                  このダイアログを閉じるとパスワードは二度と表示されません。
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                新しいパスワードが自動生成されます。現在のパスワードは無効になります。
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResetPasswordDialog(false);
                  setResetPassword(null);
                }}
              >
                {resetPassword ? "閉じる" : "キャンセル"}
              </Button>
              {!resetPassword && (
                <Button
                  variant="destructive"
                  onClick={handleResetPassword}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  リセットする
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
