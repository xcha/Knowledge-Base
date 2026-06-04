"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { knowledgeApi, type KnowledgeBase } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingKb, setEditingKb] = useState<string | null>(null);
  const [editKbName, setEditKbName] = useState("");

  async function handleRenameKb(id: string) {
    if (!editKbName.trim()) return;
    await knowledgeApi.rename(id, editKbName.trim());
    setEditingKb(null);
    fetchKbs();
  }

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchKbs();
  }, [user]);

  async function fetchKbs() {
    try {
      const res = await knowledgeApi.list();
      setKbs(res.data);
    } finally {
      setLoading(false);
    }
  }

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
    await knowledgeApi.delete(id);
    setKbs((prev) => prev.filter((kb) => kb.id !== id));
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">AI 知识库</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/teams"
            className="text-sm text-gray-500 hover:text-green-600 transition"
          >
            👥 团队
          </Link>
          <Link
            href="/dashboard/stats"
            className="text-sm text-gray-500 hover:text-blue-600 transition"
          >
            📊 数据看板
          </Link>
          <Link
            href="/dashboard/membership"
            className="text-sm text-yellow-600 hover:text-yellow-700 transition"
          >
            💎 会员中心
          </Link>
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900 transition"
          >
            退出
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">我的知识库</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + 新建知识库
          </button>
        </div>

        {/* 新建表单 */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3"
          >
            <input
              autoFocus
              placeholder="知识库名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              placeholder="描述（可选）"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {creating ? "创建中..." : "创建"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
              >
                取消
              </button>
            </div>
          </form>
        )}

        {/* 知识库列表 */}
        {loading ? (
          <p className="text-sm text-gray-400">加载中...</p>
        ) : kbs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-sm">还没有知识库，点击右上角新建一个</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {kbs.map((kb) => (
              <div
                key={kb.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-blue-300 transition cursor-pointer"
                onClick={() => router.push(`/dashboard/${kb.id}`)}
              >
                <div className="flex-1 min-w-0">
                  {editingKb === kb.id ? (
                    <div
                      className="flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editKbName}
                        onChange={(e) => setEditKbName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameKb(kb.id);
                          if (e.key === "Escape") setEditingKb(null);
                        }}
                        onBlur={() => setEditingKb(null)}
                        className="border border-blue-400 rounded px-2 py-0.5 text-sm w-full focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-900 truncate">
                        {kb.name}
                      </p>
                      {kb.team && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded shrink-0">
                          👥 {kb.team.name}
                        </span>
                      )}
                    </div>
                  )}
                  {kb.description && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                      {kb.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {kb._count.documents} 个文档
                  </p>
                </div>
                <div
                  className="flex items-center gap-2 ml-4 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => router.push(`/dashboard/${kb.id}/chat`)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    对话
                  </button>
                  <button
                    onClick={() => handleDelete(kb.id)}
                    className="text-sm text-red-400 hover:text-red-600 transition"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
