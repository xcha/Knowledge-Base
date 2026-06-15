'use client';

import { getErrorMessage } from "@/lib/error";
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { knowledgeApi, teamApi, type Document, type KnowledgeBase, type Team, type FolderNode } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Loading } from '@/components/Loading';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArrowLeft, Network, MessageSquare, Upload, Pencil, Tag, Trash2, Save, X, Share2, Users, History, Clock, Folder } from 'lucide-react';
import type { DocVersion } from '@/lib/types';

export default function KbDetailPage({ params }: { params: Promise<{ kbId: string }> }) {
  const { kbId } = use(params);
  const [kbInfo, setKbInfo] = useState<KnowledgeBase | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [editingKb, setEditingKb] = useState(false);
  const [kbName, setKbName] = useState('');
  const [kbDesc, setKbDesc] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [editTagsValue, setEditTagsValue] = useState('');
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [contentDocId, setContentDocId] = useState('');
  const [contentText, setContentText] = useState('');
  const [savingContent, setSavingContent] = useState(false);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [sharingKb, setSharingKb] = useState(false);
  const [versionHistory, setVersionHistory] = useState<DocVersion[] | null>(null);
  const [versionDocName, setVersionDocName] = useState('');
  const [folderTree, setFolderTree] = useState<FolderNode | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [movingDocId, setMovingDocId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState('/');

  async function loadTeams() {
    try { const res = await teamApi.listMine(); setMyTeams(res.data); } catch { /* */ }
  }

  async function handleShareKb(teamId: string) {
    await teamApi.shareKb(teamId, kbId);
    setSharingKb(false);
    fetchDocs(selectedTag);
  }

  async function handleUnshareKb() {
    if (!confirm('取消共享后团队成员将无法访问此知识库，确认？')) return;
    if (!kbInfo?.teamId) return;
    await teamApi.unshareKb(kbInfo.teamId, kbId);
    fetchDocs(selectedTag);
  }

  async function handleRenameDoc(docId: string) {
    if (!renameValue.trim()) return;
    await knowledgeApi.renameDocument(kbId, docId, renameValue.trim());
    setRenamingDocId(null);
    fetchDocs(selectedTag);
  }

  async function openContentEditor(docId: string) {
    try {
      const res = await knowledgeApi.getDocumentContent(kbId, docId);
      setContentDocId(docId);
      setContentText(res.data.content);
      setEditingContent(docId);
    } catch (err: unknown) {
      alert(getErrorMessage(err, '加载文档内容失败'));
    }
  }

  async function handleSaveContent() {
    if (!contentText.trim()) return;
    setSavingContent(true);
    try {
      await knowledgeApi.updateContent(kbId, contentDocId, contentText);
      setEditingContent(null);
      fetchDocs(selectedTag);
    } catch (err: unknown) {
      alert(getErrorMessage(err, '保存失败'));
    } finally {
      setSavingContent(false);
    }
  }

  const fetchDocs = useCallback(async (tag?: string, folder?: string) => {
    try {
      const [kbsRes, docsRes, tagsRes, foldersRes] = await Promise.all([
        knowledgeApi.list(),
        knowledgeApi.listDocuments(kbId, tag, folder),
        knowledgeApi.getTags(kbId),
        knowledgeApi.getFolders(kbId),
      ]);
      const kb = kbsRes.data.find((k) => k.id === kbId) ?? null;
      setKbInfo(kb);
      if (kb && !editingKb) {
        setKbName(kb.name);
        setKbDesc(kb.description ?? '');
      }
      setDocs(docsRes.data);
      setAllTags(tagsRes.data);
      setFolderTree(foldersRes.data);
    } finally {
      setLoading(false);
    }
  }, [kbId, editingKb]);

  async function handleUpdateKb() {
    if (!kbName.trim()) return;
    await knowledgeApi.updateKb(kbId, { name: kbName.trim(), description: kbDesc.trim() || undefined });
    setEditingKb(false);
    fetchDocs(selectedTag);
  }

  useEffect(() => { fetchDocs(selectedTag, selectedFolder); }, [fetchDocs, selectedTag, selectedFolder]);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadResult('');
    try {
      const res = await knowledgeApi.uploadDocument(kbId, file, tagsInput || undefined);
      setUploadResult(`上传成功，共生成 ${res.data.chunkCount} 个向量块`);
      setTagsInput('');
      await fetchDocs(selectedTag);
    } catch (err: unknown) {
      setUploadResult(getErrorMessage(err, '上传失败'));
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = '';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDelete(docId: string, name: string) {
    if (!confirm(`确认删除文档「${name}」？`)) return;
    await knowledgeApi.deleteDocument(kbId, docId);
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    fetchDocs(selectedTag);
  }

  async function handleSaveTags(docId: string) {
    await knowledgeApi.updateTags(kbId, docId, editTagsValue);
    setEditingTags(null);
    fetchDocs(selectedTag);
  }

  async function openVersionHistory(docId: string, docName: string) {
    try {
      const res = await knowledgeApi.getVersions(kbId, docId);
      setVersionHistory(res.data);
      setVersionDocName(docName);
    } catch (err: unknown) {
      alert(getErrorMessage(err, '加载版本历史失败'));
    }
  }

  async function handleMoveToFolder(docId: string) {
    if (!moveTarget.trim()) return;
    try {
      await knowledgeApi.updateFolder(kbId, docId, moveTarget);
      setMovingDocId(null);
      setMoveTarget('/');
      fetchDocs(selectedTag, selectedFolder);
    } catch (err: unknown) {
      alert(getErrorMessage(err, '移动失败'));
    }
  }

  function renderFolderTree(node: FolderNode, depth: number = 0) {
    return (
      <div key={node.path}>
        <button
          onClick={() => setSelectedFolder(node.path === selectedFolder ? '' : node.path)}
          className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition ${
            selectedFolder === node.path
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {node.name === '/' ? '📁 全部文档' : `📁 ${node.name}`}
        </button>
        {node.children.map(child => renderFolderTree(child, depth + 1))}
      </div>
    );
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    const mb = bytes / 1024 / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border px-6 py-4 space-y-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard"><ArrowLeft className="size-4" /> 返回</Link>
          </Button>
          <h1 className="text-lg font-semibold text-foreground">文档管理</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/${kbId}/graph`}>
                <Network className="size-4" /> 知识图谱
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/dashboard/${kbId}/chat`}>
                <MessageSquare className="size-4" /> 开始对话
              </Link>
            </Button>
          </div>
        </div>

        {editingKb ? (
          <div className="flex items-center gap-3 flex-wrap">
            <Input autoFocus value={kbName} onChange={(e) => setKbName(e.target.value)}
              placeholder="知识库名称" className="w-48" />
            <Input value={kbDesc} onChange={(e) => setKbDesc(e.target.value)}
              placeholder="描述（可选）" className="flex-1 min-w-[200px]" />
            <Button size="sm" onClick={handleUpdateKb}>保存</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditingKb(false)}>取消</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-foreground">{kbInfo?.name ?? '加载中...'}</h2>
            {kbInfo?.description && <span className="text-xs text-muted-foreground">— {kbInfo.description}</span>}
            <Button variant="ghost" size="sm" onClick={() => setEditingKb(true)} className="text-muted-foreground">
              <Pencil className="size-3" /> 编辑
            </Button>
            <div className="relative ml-2">
              {kbInfo?.team ? (
                <span className="flex items-center gap-1">
                  <Badge variant="default" className="text-xs">
                    <Users className="size-3 mr-1" /> {kbInfo.team.name}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleUnshareKb}
                    className="text-destructive hover:text-destructive text-xs h-6">取消</Button>
                </span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => { setSharingKb(!sharingKb); loadTeams(); }}
                  className="text-muted-foreground">
                  <Share2 className="size-3" /> 共享
                </Button>
              )}
              {sharingKb && (
                <div className="absolute top-full mt-1 left-0 bg-background border border-border rounded-lg shadow-lg p-2 z-10 min-w-[160px]">
                  <p className="text-[10px] text-muted-foreground mb-1">共享到团队：</p>
                  {myTeams.length === 0 ? (
                    <p className="text-xs text-muted-foreground">还没有团队，去创建 →</p>
                  ) : (
                    myTeams.map((t) => (
                      <Button key={t.id} variant="ghost" size="sm"
                        onClick={() => handleShareKb(t.id)}
                        className="w-full justify-start text-xs">{t.name}</Button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Card
          className={`mb-6 border-dashed transition-colors ${isDragging ? 'border-primary bg-primary/5' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-8 text-center">
            <Upload className={`size-8 mx-auto mb-3 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-muted-foreground text-sm mb-3">
              {isDragging ? '松开即可上传' : '拖拽文件到此处，或点击下方按钮选择文件'}
            </p>
            <p className="text-muted-foreground text-xs mb-3">支持 .txt / .md / .pdf</p>
            <div className="mb-3">
              <Input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                placeholder="标签（可选，逗号分隔，如：技术,前端,React）"
                className="max-w-xs mx-auto text-xs" />
            </div>
            <label className="cursor-pointer">
              <Button asChild disabled={uploading}>
                <span>{uploading ? '上传中...' : '选择文件上传'}</span>
              </Button>
              <input type="file" accept=".txt,.md,.pdf" className="hidden"
                onChange={handleUpload} disabled={uploading} />
            </label>
            {uploadResult && <p className="mt-3 text-sm text-green-600">{uploadResult}</p>}
          </CardContent>
        </Card>

        {editingContent && (
          <Card className="mb-6">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">编辑文档内容</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingContent(null)}>
                  <X className="size-4" />
                </Button>
              </div>
              <Textarea autoFocus value={contentText} onChange={(e) => setContentText(e.target.value)}
                rows={16} className="font-mono resize-y" placeholder="文档内容..." />
              <div className="flex gap-2">
                <Button onClick={handleSaveContent} disabled={savingContent}>
                  <Save className="size-4" />
                  {savingContent ? '保存中...' : '保存并重新向量化'}
                </Button>
                <Button variant="outline" onClick={() => setEditingContent(null)}>取消</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {versionHistory && (
          <Card className="mb-6">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">
                  <History className="size-4 inline mr-2" />
                  版本历史 — {versionDocName}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setVersionHistory(null)}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {versionHistory.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition">
                    <div className="flex items-center gap-3">
                      <Badge variant={v.version === versionHistory[versionHistory.length - 1]?.version ? 'default' : 'secondary'}>
                        v{v.version}
                      </Badge>
                      <div>
                        <p className="text-sm text-foreground">{v.originalName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" />
                          {new Date(v.createdAt).toLocaleString('zh-CN')}
                          <span className="ml-2">{formatSize(v.size)} · {v._count.chunks} 个向量块</span>
                        </p>
                      </div>
                    </div>
                    {v.version === versionHistory[versionHistory.length - 1]?.version && (
                      <Badge variant="outline" className="text-xs">当前版本</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {movingDocId && (
          <Card className="mb-6">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">
                  <Folder className="size-4 inline mr-2" />
                  移动到文件夹
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setMovingDocId(null)}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                  placeholder="输入文件夹路径，如 /技术/前端/"
                  className="flex-1"
                />
                <Button onClick={() => handleMoveToFolder(movingDocId)}>移动</Button>
                <Button variant="outline" onClick={() => setMovingDocId(null)}>取消</Button>
              </div>
              {folderTree && folderTree.children.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="mb-1">已有文件夹：</p>
                  <div className="flex flex-wrap gap-1">
                    {folderTree.children.map(child => (
                      <Button key={child.path} variant="ghost" size="sm" className="h-6 text-xs"
                        onClick={() => setMoveTarget(child.path)}>
                        {child.path}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 文件夹树 + 标签筛选 */}
        <div className="flex gap-4 mb-4">
          {folderTree && folderTree.children.length > 0 && (
            <Card className="w-48 shrink-0">
              <CardContent className="p-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">文件夹</p>
                {renderFolderTree(folderTree)}
              </CardContent>
            </Card>
          )}
          <div className="flex-1">
            {allTags.length > 0 && (
              <div className="mb-4">
                <ToggleGroup value={[selectedTag]} onValueChange={(v: string[]) => setSelectedTag(v[0] ?? '')}
                  className="justify-start flex-wrap">
                  <ToggleGroupItem value="" className="text-xs">全部</ToggleGroupItem>
                  {allTags.map((tag) => (
                    <ToggleGroupItem key={tag} value={tag} className="text-xs">{tag}</ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}

            <h2 className="text-base font-medium text-foreground mb-3">
              已上传文档（{docs.length}）
              {selectedFolder && <span className="text-sm font-normal text-muted-foreground ml-2">— {selectedFolder}</span>}
            </h2>
        {loading ? (
          <Loading />
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有文档，上传第一个文件开始吧</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renamingDocId === doc.id ? (
                        <Input autoFocus value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameDoc(doc.id); if (e.key === 'Escape') setRenamingDocId(null); }}
                          onBlur={() => setRenamingDocId(null)}
                          className="h-7 text-sm w-48" />
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary"
                          onDoubleClick={() => { setRenamingDocId(doc.id); setRenameValue(doc.originalName); }}>
                          {doc.originalName}
                        </p>
                      )}
                      {doc.tags && doc.tags.split(',').filter(Boolean).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t.trim()}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatSize(doc.size)} · {doc._count.chunks} 个向量块
                      {doc.version > 1 && <span className="ml-2 text-amber-500">v{doc.version}</span>}
                    </p>
                    {editingTags === doc.id && (
                      <div className="mt-2 flex gap-2">
                        <Input autoFocus value={editTagsValue}
                          onChange={(e) => setEditTagsValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTags(doc.id); }}
                          className="flex-1 h-7 text-xs" />
                        <Button size="sm" onClick={() => handleSaveTags(doc.id)}>保存</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingTags(null)}>取消</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openContentEditor(doc.id); }}
                      className="text-muted-foreground hover:text-green-600">
                      <Pencil className="size-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingTags(doc.id); setEditTagsValue(doc.tags); }}
                      className="text-muted-foreground hover:text-primary">
                      <Tag className="size-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setMovingDocId(doc.id); setMoveTarget(doc.folder || '/'); }}
                      className="text-muted-foreground hover:text-orange-600">
                      <Folder className="size-3" />
                    </Button>
                    {doc.version > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => openVersionHistory(doc.id, doc.originalName)}
                        className="text-muted-foreground hover:text-blue-600">
                        <History className="size-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id, doc.originalName)}
                      className="text-destructive hover:text-destructive">
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}
