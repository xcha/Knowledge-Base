'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { teamApi, type Team } from '@/lib/api';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => { fetchTeams(); }, []);

  async function fetchTeams() {
    try {
      const res = await teamApi.listMine();
      setTeams(res.data);
    } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await teamApi.create(name.trim(), desc.trim() || undefined);
      setName(''); setDesc(''); setShowCreate(false);
      await fetchTeams();
    } finally { setCreating(false); }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedTeam) return;
    setInviting(true); setResult('');
    try {
      await teamApi.invite(selectedTeam.id, inviteEmail.trim());
      setInviteEmail('');
      setResult('邀请成功');
      // Refresh team detail
      const res = await teamApi.get(selectedTeam.id);
      setSelectedTeam(res.data);
    } catch (err: any) {
      setResult(err.response?.data?.message ?? '邀请失败');
    } finally { setInviting(false); }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedTeam) return;
    await teamApi.removeMember(selectedTeam.id, userId);
    const res = await teamApi.get(selectedTeam.id);
    setSelectedTeam(res.data);
  }

  async function viewTeam(teamId: string) {
    const res = await teamApi.get(teamId);
    setSelectedTeam(res.data);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← 返回</Link>
        <h1 className="text-lg font-semibold">团队管理</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {selectedTeam ? (
          /* ---- 团队详情 ---- */
          <div className="space-y-6">
            <button onClick={() => { setSelectedTeam(null); fetchTeams(); }}
              className="text-sm text-gray-500 hover:text-gray-900">← 返回团队列表</button>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold">{selectedTeam.name}</h2>
              {selectedTeam.description && <p className="text-sm text-gray-500 mt-1">{selectedTeam.description}</p>}

              {/* 成员列表 */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3">团队成员（{selectedTeam.members?.length ?? 0}）</h3>
                <div className="space-y-1">
                  {selectedTeam.members?.map((m) => (
                    <div key={m.user.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{m.user.name || m.user.email}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{m.role === 'owner' ? '创建者' : '成员'}</span>
                      </div>
                      {m.role !== 'owner' && (
                        <button onClick={() => handleRemoveMember(m.user.id)}
                          className="text-xs text-red-400 hover:text-red-600">移除</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 邀请成员 */}
              <form onSubmit={handleInvite} className="mt-4 flex gap-2">
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="输入用户邮箱邀请加入团队"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={inviting}
                  className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {inviting ? '邀请中' : '邀请'}
                </button>
              </form>
              {result && <p className="text-xs mt-2 text-green-600">{result}</p>}
            </div>

            {/* 团队知识库 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium mb-3">共享知识库</h3>
              {selectedTeam.knowledgeBases?.length ? (
                <div className="space-y-2">
                  {selectedTeam.knowledgeBases.map((kb) => (
                    <Link key={kb.id} href={`/dashboard/${kb.id}`}
                      className="block border border-gray-100 rounded-lg px-4 py-3 hover:border-blue-200 transition">
                      <span className="text-sm font-medium">{kb.name}</span>
                      <span className="text-xs text-gray-400 ml-3">{kb._count.documents} 个文档</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">暂无共享知识库</p>
              )}
            </div>
          </div>
        ) : (
          /* ---- 团队列表 ---- */
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">我的团队</h2>
              <button onClick={() => setShowCreate(true)}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">+ 创建团队</button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
                <input autoFocus placeholder="团队名称" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="描述（可选）" value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-2">
                  <button type="submit" disabled={creating}
                    className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">创建</button>
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">取消</button>
                </div>
              </form>
            )}

            {loading ? (
              <p className="text-sm text-gray-400">加载中...</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-gray-400">还没有团队</p>
            ) : (
              <div className="space-y-3">
                {teams.map((t) => (
                  <div key={t.id} onClick={() => viewTeam(t.id)}
                    className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between cursor-pointer hover:border-blue-300 transition">
                    <div>
                      <p className="font-medium text-gray-900">{t.name}</p>
                      {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{t._count?.members ?? 0} 成员 · {t._count?.knowledgeBases ?? 0} 知识库</p>
                    </div>
                    <span className="text-xs text-blue-600">查看 →</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
