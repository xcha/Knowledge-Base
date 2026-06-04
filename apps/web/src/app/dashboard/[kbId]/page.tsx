'use client';

import { getErrorMessage } from "@/lib/error";
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { knowledgeApi, type Document, type KnowledgeBase } from '@/lib/api';

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
  const [tagsInput, setTagsInput] = useState('');
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [editTagsValue, setEditTagsValue] = useState('');
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // 文档内容编辑
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [contentDocId, setContentDocId] = useState('');
  const [contentText, setContentText] = useState('');
  const [savingContent, setSavingContent] = useState(false);

  async function handleRenameDoc(docId: string) {
    if (!renameValue.trim()) return;
    await knowledgeApi.renameDocument(kbId, docId, renameValue.trim());
    setRenamingDocId(null);
    fetchDocs(selectedTag);
  }

  // 打开文档内容编辑器
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

  // 保存文档内容
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

  const fetchDocs = useCallback(async (tag?: string) => {
    try {
      const [kbsRes, docsRes, tagsRes] = await Promise.all([
        knowledgeApi.list(),
        knowledgeApi.listDocuments(kbId, tag),
        knowledgeApi.getTags(kbId),
      ]);
      const kb = kbsRes.data.find((k) => k.id === kbId) ?? null;
      setKbInfo(kb);
      if (kb && !editingKb) {
        setKbName(kb.name);
        setKbDesc(kb.description ?? '');
      }
      setDocs(docsRes.data);
      setAllTags(tagsRes.data);
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

  useEffect(() => { fetchDocs(selectedTag); }, [fetchDocs, selectedTag]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
      e.target.value = '';
    }
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

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    const mb = bytes / 1024 / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 space-y-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← 返回</Link>
          <h1 className="text-lg font-semibold text-gray-900">文档管理</h1>
          <div className="ml-auto flex gap-2">
            <Link href={`/dashboard/${kbId}/graph`}
              className="text-sm text-gray-500 hover:text-purple-600 border border-gray-300 px-3 py-1.5 rounded-lg transition">
              🕸 知识图谱
            </Link>
            <Link href={`/dashboard/${kbId}/chat`}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              开始对话
            </Link>
          </div>
        </div>

        {/* 知识库名称/描述编辑区 */}
        {editingKb ? (
          <div className="flex items-center gap-3 flex-wrap">
            <input autoFocus value={kbName}
              onChange={(e) => setKbName(e.target.value)}
              placeholder="知识库名称"
              className="border border-blue-400 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none w-48" />
            <input value={kbDesc}
              onChange={(e) => setKbDesc(e.target.value)}
              placeholder="描述（可选）"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]" />
            <button onClick={handleUpdateKb}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">保存</button>
            <button onClick={() => setEditingKb(false)}
              className="text-xs text-gray-400 hover:text-gray-600">取消</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-900">{kbInfo?.name ?? '加载中...'}</h2>
            {kbInfo?.description && (
              <span className="text-xs text-gray-400">— {kbInfo.description}</span>
            )}
            <button onClick={() => setEditingKb(true)}
              className="text-xs text-gray-400 hover:text-blue-600 transition ml-1">✏️ 编辑</button>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* 上传区域 */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6 hover:border-blue-400 transition">
          <p className="text-gray-500 text-sm mb-3">支持 .txt / .md / .pdf 文件</p>

          {/* 标签输入 */}
          <div className="mb-3">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="标签（可选，逗号分隔，如：技术,前端,React）"
              className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="cursor-pointer">
            <span className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              {uploading ? '上传中...' : '选择文件上传'}
            </span>
            <input type="file" accept=".txt,.md,.pdf" className="hidden"
              onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadResult && (<p className="mt-3 text-sm text-green-600">{uploadResult}</p>)}
        </div>

        {/* 文档内容编辑器（点击文档卡片上的"编辑"按钮打开） */}
        {editingContent && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">编辑文档内容</h3>
              <button onClick={() => setEditingContent(null)}
                className="text-xs text-gray-400 hover:text-gray-600">关闭</button>
            </div>
            <textarea
              autoFocus
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={16}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y"
              placeholder="文档内容..."
            />
            <div className="flex gap-2">
              <button onClick={handleSaveContent} disabled={savingContent}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {savingContent ? '保存中...' : '保存并重新向量化'}
              </button>
              <button onClick={() => setEditingContent(null)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition">
                取消
              </button>
            </div>
          </div>
        )}

        {/* 标签筛选 */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-gray-400">筛选：</span>
            <button onClick={() => setSelectedTag('')}
              className={`text-xs px-2.5 py-1 rounded-full transition ${
                !selectedTag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>全部</button>
            {allTags.map((tag) => (
              <button key={tag} onClick={() => setSelectedTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full transition ${
                  selectedTag === tag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>{tag}</button>
            ))}
          </div>
        )}

        {/* 文档列表 */}
        <h2 className="text-base font-medium text-gray-900 mb-3">
          已上传文档（{docs.length}）
        </h2>
        {loading ? (
          <p className="text-sm text-gray-400">加载中...</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-gray-400">还没有文档，上传第一个文件开始吧</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {renamingDocId === doc.id ? (
                      <input autoFocus value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameDoc(doc.id); if (e.key === 'Escape') setRenamingDocId(null); }}
                        onBlur={() => setRenamingDocId(null)}
                        className="border border-blue-400 rounded px-2 py-0.5 text-sm focus:outline-none" />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                        onDoubleClick={() => { setRenamingDocId(doc.id); setRenameValue(doc.originalName); }}>
                        {doc.originalName}
                      </p>
                    )}
                    {doc.tags && doc.tags.split(',').filter(Boolean).map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{t.trim()}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatSize(doc.size)} · {doc._count.chunks} 个向量块
                    {doc.version > 1 && <span className="ml-2 text-amber-500">v{doc.version}</span>}
                  </p>

                  {/* 编辑标签 */}
                  {editingTags === doc.id && (
                    <div className="mt-2 flex gap-2">
                      <input autoFocus value={editTagsValue}
                        onChange={(e) => setEditTagsValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTags(doc.id); }}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button onClick={() => handleSaveTags(doc.id)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded">保存</button>
                      <button onClick={() => setEditingTags(null)}
                        className="text-xs text-gray-400 hover:text-gray-600">取消</button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <button onClick={(e) => { e.stopPropagation(); openContentEditor(doc.id); }}
                    className="text-xs text-gray-400 hover:text-green-600 transition">编辑</button>
                  <button onClick={() => { setEditingTags(doc.id); setEditTagsValue(doc.tags); }}
                    className="text-xs text-gray-400 hover:text-blue-600 transition px-1">标签</button>
                  <button onClick={() => handleDelete(doc.id, doc.originalName)}
                    className="text-sm text-red-400 hover:text-red-600 ml-1 transition">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
