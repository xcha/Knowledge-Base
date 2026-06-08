"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { knowledgeApi, type KnowledgeBase } from "@/lib/api";
import { useAuthStore, useHydrated } from "@/lib/store";
import { getErrorMessage } from "@/lib/error";
import { PageHeader } from "@/components/PageHeader";
import { Loading } from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  MessageSquare,
  Trash2,
  Users,
  BarChart3,
  Gem,
  LogOut,
  BookOpen,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const hydrated = useHydrated();
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingKb, setEditingKb] = useState<string | null>(null);
  const [editKbName, setEditKbName] = useState("");

  async function fetchKbs() {
    try {
      const res = await knowledgeApi.list();
      setKbs(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleRenameKb(id: string) {
    if (!editKbName.trim()) return;
    await knowledgeApi.updateKb(id, { name: editKbName.trim() });
    setEditingKb(null);
    fetchKbs();
  }

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchKbs();
  }, [user, hydrated, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await knowledgeApi.create(newName.trim(), newDesc.trim() || undefined);
      setNewName("");
      setNewDesc("");
      setShowForm(false);
      await fetchKbs();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除该知识库？此操作不可恢复。")) return;
    try {
      await knowledgeApi.delete(id);
      setKbs((prev) => prev.filter((kb) => kb.id !== id));
    } catch (err) {
      alert(getErrorMessage(err, "删除失败"));
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="AI 知识库">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/teams">
            <Users className="size-4" />
            团队
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/stats">
            <BarChart3 className="size-4" />
            数据看板
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/membership">
            <Gem className="size-4 text-yellow-600" />
            会员中心
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="size-4" />
          退出
        </Button>
      </PageHeader>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">我的知识库</h2>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="size-4" />
            新建知识库
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <Input
                  autoFocus
                  placeholder="知识库名称"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="描述（可选）"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={creating}>
                    {creating ? "创建中..." : "创建"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : kbs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="size-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">还没有知识库，点击右上角新建一个</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {kbs.map((kb) => (
              <Card
                key={kb.id}
                className="cursor-pointer card-hover"
                onClick={() => router.push(`/dashboard/${kb.id}`)}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {editingKb === kb.id ? (
                      <div
                        className="flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          autoFocus
                          value={editKbName}
                          onChange={(e) => setEditKbName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameKb(kb.id);
                            if (e.key === "Escape") setEditingKb(null);
                          }}
                          onBlur={() => setEditingKb(null)}
                          className="h-7 text-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {kb.name}
                        </p>
                        {kb.team && (
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                          >
                            <Users className="size-3 mr-1" />
                            {kb.team.name}
                          </Badge>
                        )}
                      </div>
                    )}
                    {kb.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {kb.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {kb._count.documents} 个文档
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2 ml-4 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/${kb.id}/chat`}>
                        <MessageSquare className="size-4" />
                        对话
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(kb.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
