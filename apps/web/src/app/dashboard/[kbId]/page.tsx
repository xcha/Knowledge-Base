'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { knowledgeApi, type Document } from '@/lib/api';

export default function KbDetailPage({ params }: { params: Promise<{ kbId: string }> }) {
  // Next.js 15: params 是 Promise，需要用 use() 解包
  const { kbId } = use(params);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');

  useEffect(() => {
    fetchDocs();
  }, [kbId]);

  async function fetchDocs() {
    try {
      const res = await knowledgeApi.listDocuments(kbId);
      setDocs(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult('');
    try {
      const res = await knowledgeApi.uploadDocument(kbId, file);
      setUploadResult(`上传成功，共生成 ${res.data.chunkCount} 个向量块`);
      await fetchDocs();
    } catch (err: any) {
      setUploadResult(err.response?.data?.message ?? '上传失败');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(docId: string, name: string) {
    if (!confirm(`确认删除文档「${name}」？`)) return;
    await knowledgeApi.deleteDocument(kbId, docId);
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          ← 返回
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">文档管理</h1>
        <div className="ml-auto">
          <Link
            href={`/dashboard/${kbId}/chat`}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            开始对话
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* 上传区域 */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6 hover:border-blue-400 transition">
          <p className="text-gray-500 text-sm mb-3">支持 .txt / .md 文件</p>
          <label className="cursor-pointer">
            <span className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              {uploading ? '上传中...' : '选择文件上传'}
            </span>
            <input
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          {uploadResult && (
            <p className="mt-3 text-sm text-green-600">{uploadResult}</p>
          )}
        </div>

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
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.originalName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatSize(doc.size)} · {doc._count.chunks} 个向量块
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.originalName)}
                  className="text-sm text-red-400 hover:text-red-600 ml-4 transition"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
