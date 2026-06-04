'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { chatApi, type ChatSession, type ChatMessage, type FeedbackData } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type Mode = 'rag' | 'agent';

interface ToolCallEvent {
  toolCall: { name: string; input: unknown };
}

const TOOL_LABELS: Record<string, string> = {
  search_knowledge: '检索知识库',
  get_document_list: '获取文档列表',
};

export default function ChatPage({ params }: { params: Promise<{ kbId: string }> }) {
  const { kbId } = use(params);
  const token = useAuthStore((s) => s.token);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('rag');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackData>>({});
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
  }, [kbId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  async function fetchSessions() {
    const res = await chatApi.listSessions(kbId);
    setSessions(res.data);
    if (res.data.length > 0 && !activeSession) {
      selectSession(res.data[0].id);
    }
  }

  async function selectSession(sessionId: string) {
    setActiveSession(sessionId);
    const res = await chatApi.getMessages(kbId, sessionId);
    setMessages(res.data);
  }

  async function createSession() {
    const res = await chatApi.createSession(kbId);
    setSessions((prev) => [res.data, ...prev]);
    setActiveSession(res.data.id);
    setMessages([]);
  }

  async function handleRenameSession(sessionId: string) {
    if (!editingSessionTitle.trim()) return;
    await chatApi.renameSession(kbId, sessionId, editingSessionTitle.trim());
    setEditingSessionId(null);
    fetchSessions();
  }

  async function handleFeedback(msgId: string, type: 'like' | 'dislike') {
    if (!activeSession) return;
    try {
      await chatApi.feedbackMessage(kbId, activeSession, msgId, type);
      const fb = await chatApi.getFeedback(kbId, activeSession, msgId);
      setFeedbackMap((prev) => ({ ...prev, [msgId]: fb.data }));
    } catch { /* ignore */ }
  }

  async function deleteSession(sessionId: string) {
    await chatApi.deleteSession(kbId, sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSession === sessionId) {
      setActiveSession(null);
      setMessages([]);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !activeSession || streaming) return;
    const question = input.trim();
    setInput('');
    setStreaming(true);
    setStreamingText('');
    setActiveToolCall(null);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
    const url =
      mode === 'rag'
        ? `${base}/knowledge/${kbId}/sessions/${activeSession}/chat`
        : `${base}/knowledge/${kbId}/agent/chat`;

    const body =
      mode === 'rag'
        ? { question }
        : { question, sessionId: activeSession };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          let json: Record<string, unknown>;
          try {
            json = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (json.text) {
            aiText += json.text as string;
            setStreamingText(aiText);
          }

          if (json.toolCall) {
            const tc = (json as unknown as ToolCallEvent).toolCall;
            setActiveToolCall(TOOL_LABELS[tc.name] ?? tc.name);
          }

          if (json.toolResult) {
            setActiveToolCall(null);
          }

          if (json.done) {
            const aiMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiText,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, aiMsg]);
            setStreamingText('');
          }
        }
      }
    } catch {
      setStreamingText('');
    } finally {
      setStreaming(false);
      setActiveToolCall(null);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <Link href={`/dashboard/${kbId}`} className="text-sm text-gray-500 hover:text-gray-900">
          ← 文档管理
        </Link>
        <h1 className="text-base font-semibold text-gray-900">知识库对话</h1>

        <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('rag')}
            className={`text-xs px-3 py-1.5 rounded-md transition ${
              mode === 'rag'
                ? 'bg-white text-gray-900 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            RAG 模式
          </button>
          <button
            onClick={() => setMode('agent')}
            className={`text-xs px-3 py-1.5 rounded-md transition ${
              mode === 'agent'
                ? 'bg-white text-gray-900 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Agent 模式
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={createSession}
              className="w-full text-sm bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition"
            >
              + 新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`px-3 py-2.5 cursor-pointer flex items-center justify-between group hover:bg-gray-50 transition ${
                  activeSession === s.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                }`}
              >
                {editingSessionId === s.id ? (
                  <input autoFocus value={editingSessionTitle}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditingSessionTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSession(s.id); if (e.key === 'Escape') setEditingSessionId(null); }}
                    onBlur={() => setEditingSessionId(null)}
                    className="text-sm border border-blue-400 rounded px-1 py-0.5 w-full focus:outline-none" />
                ) : (
                  <span className="text-sm text-gray-700 truncate cursor-pointer hover:text-blue-600"
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingSessionId(s.id); setEditingSessionTitle(s.title); }}>
                    {s.title}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeSession ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              选择或新建一个对话
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      {msg.content}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                          <button onClick={() => handleFeedback(msg.id, 'like')}
                            className={`text-xs px-2 py-0.5 rounded transition ${feedbackMap[msg.id]?.likes ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600'}`}>
                            👍 {feedbackMap[msg.id]?.likes || ''}
                          </button>
                          <button onClick={() => handleFeedback(msg.id, 'dislike')}
                            className={`text-xs px-2 py-0.5 rounded transition ${feedbackMap[msg.id]?.dislikes ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600'}`}>
                            👎 {feedbackMap[msg.id]?.dislikes || ''}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 骨架屏思考动画：流式开始但还没收到 token，或正在调工具 */}
                {streaming && !streamingText && !activeToolCall && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 max-w-[70%] space-y-3 animate-pulse">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-xs text-gray-400 ml-1">正在思考</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                )}

                {activeToolCall && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 max-w-[70%] space-y-3 animate-pulse">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-xs text-amber-600 ml-1">正在{activeToolCall}</span>
                      </div>
                      <div className="h-3 bg-amber-50 rounded w-3/4" />
                      <div className="h-3 bg-amber-50 rounded w-1/2" />
                    </div>
                  </div>
                )}

                {streamingText && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm bg-white border border-gray-200 text-gray-800 whitespace-pre-wrap">
                      {streamingText}
                      <span className="inline-block w-1 h-4 bg-gray-400 ml-0.5 animate-pulse" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-gray-200 bg-white px-4 py-3 flex gap-2 shrink-0">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    mode === 'agent'
                      ? 'Agent 模式：AI 会自主决定是否检索知识库'
                      : '输入问题，Enter 发送，Shift+Enter 换行'
                  }
                  rows={1}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={streaming || !input.trim()}
                  className="bg-blue-600 text-white px-4 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {streaming ? '...' : '发送'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
