'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { teamApi, type Team } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { PageHeader } from '@/components/PageHeader';
import { Loading } from '@/components/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, ArrowLeft, UserPlus, Trash2, Users, BookOpen } from 'lucide-react';

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
      const res = await teamApi.get(selectedTeam.id);
      setSelectedTeam(res.data);
    } catch (err: unknown) {
      setResult(getErrorMessage(err, '邀请失败'));
    } finally { setInviting(false); }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedTeam) return;
    try {
      await teamApi.removeMember(selectedTeam.id, userId);
      const res = await teamApi.get(selectedTeam.id);
      setSelectedTeam(res.data);
    } catch (err) {
      alert(getErrorMessage(err, '移除失败'));
    }
  }

  async function viewTeam(teamId: string) {
    try {
      const res = await teamApi.get(teamId);
      setSelectedTeam(res.data);
    } catch (err) {
      alert(getErrorMessage(err, '加载失败'));
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="团队管理" backHref="/dashboard" backLabel="返回" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {selectedTeam ? (
          <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedTeam(null); fetchTeams(); }}>
              <ArrowLeft className="size-4" />
              返回团队列表
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>{selectedTeam.name}</CardTitle>
                {selectedTeam.description && (
                  <p className="text-sm text-muted-foreground">{selectedTeam.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 成员列表 */}
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    团队成员（{selectedTeam.members?.length ?? 0}）
                  </h3>
                  <div className="space-y-1">
                    {selectedTeam.members?.map((m) => (
                      <div key={m.user.id}>
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{m.user.name || m.user.email}</span>
                            <Badge variant={m.role === 'owner' ? 'default' : 'secondary'} className="text-[10px]">
                              {m.role === 'owner' ? '创建者' : '成员'}
                            </Badge>
                          </div>
                          {m.role !== 'owner' && (
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.user.id)}
                              className="text-destructive hover:text-destructive">
                              <Trash2 className="size-3" />
                              移除
                            </Button>
                          )}
                        </div>
                        <Separator />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 邀请成员 */}
                <form onSubmit={handleInvite} className="flex gap-2">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="输入用户邮箱邀请加入团队"
                    className="flex-1"
                  />
                  <Button type="submit" disabled={inviting}>
                    <UserPlus className="size-4" />
                    {inviting ? '邀请中' : '邀请'}
                  </Button>
                </form>
                {result && (
                  <p className={`text-xs ${result.includes('成功') ? 'text-green-600' : 'text-destructive'}`}>
                    {result}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 团队知识库 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">共享知识库</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTeam.knowledgeBases?.length ? (
                  <div className="space-y-2">
                    {selectedTeam.knowledgeBases.map((kb) => (
                      <Link key={kb.id} href={`/dashboard/${kb.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition">
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{kb.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{kb._count.documents} 个文档</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无共享知识库</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">我的团队</h2>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="size-4" />
                创建团队
              </Button>
            </div>

            {showCreate && (
              <Card className="mb-6">
                <CardContent>
                  <form onSubmit={handleCreate} className="space-y-3">
                    <Input autoFocus placeholder="团队名称" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="描述（可选）" value={desc} onChange={(e) => setDesc(e.target.value)} />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={creating}>创建</Button>
                      <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <Loading />
            ) : teams.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="size-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">还没有团队</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((t) => (
                  <Card key={t.id} className="cursor-pointer card-hover"
                    onClick={() => viewTeam(t.id)}>
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{t.name}</p>
                        {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {t._count?.members ?? 0} 成员 · {t._count?.knowledgeBases ?? 0} 知识库
                        </p>
                      </div>
                      <span className="text-xs text-primary">查看 →</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
