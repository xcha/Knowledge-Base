import { get, post, patch, del } from '../request';
import type { KnowledgeBase, Document, DocVersion, GraphData } from '../types';

export const knowledgeApi = {
  list: () =>
    get<KnowledgeBase[]>('/knowledge'),

  create: (name: string, description?: string) =>
    post<KnowledgeBase>('/knowledge', { name, description }),

  updateKb: (id: string, data: { name?: string; description?: string }) =>
    patch<KnowledgeBase>(`/knowledge/${id}`, data),

  delete: (id: string) =>
    del(`/knowledge/${id}`),

  // ---- 文档 ----
  listDocuments: (kbId: string, tag?: string) =>
    get<Document[]>(`/knowledge/${kbId}/documents${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`),

  uploadDocument: (kbId: string, file: File, tags?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (tags) form.append('tags', tags);
    return post<{ documentId: string; chunkCount: number; version: number }>(
      `/knowledge/${kbId}/documents`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  getDocumentContent: (kbId: string, docId: string) =>
    get<{ id: string; originalName: string; content: string }>(`/knowledge/${kbId}/documents/${docId}/content`),

  renameDocument: (kbId: string, docId: string, originalName: string) =>
    patch(`/knowledge/${kbId}/documents/${docId}`, { originalName }),

  updateContent: (kbId: string, docId: string, content: string) =>
    patch(`/knowledge/${kbId}/documents/${docId}/content`, { content }),

  getVersions: (kbId: string, docId: string) =>
    get<DocVersion[]>(`/knowledge/${kbId}/documents/${docId}/versions`),

  deleteDocument: (kbId: string, docId: string) =>
    del(`/knowledge/${kbId}/documents/${docId}`),

  // ---- 标签 ----
  getTags: (kbId: string) =>
    get<string[]>(`/knowledge/${kbId}/tags`),

  updateTags: (kbId: string, docId: string, tags: string) =>
    post(`/knowledge/${kbId}/documents/${docId}/tags`, { tags }),

  // ---- 搜索 ----
  getGraph: (kbId: string) =>
    get<GraphData>(`/knowledge/${kbId}/graph`),
};
