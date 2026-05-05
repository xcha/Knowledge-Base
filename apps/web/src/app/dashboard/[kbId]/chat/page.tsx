'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { chatApi, type ChatSession, type ChatMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function ChatPage({ params }: { params: Promise<{ kbId: string }> }) {
  const { kbId } = use(params);
  const token = useAuthStore((s) => s.token);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
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

    // 乐观更新：先把用户消息加入列表
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // 使用 fetch 直接处理 SSE 流，axios 不支持流式读取
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/knowledge/${kbId}/sessions/${activeSession}/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ question }),
        },
      );

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // 解析 SSE 格式：每行 "data: {...}\n\n"
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          const json = JSON.parse(line.slice(6));
          if (json.text) {
            aiText += json.text;
            setStreamingText(aiText);
          }
          if (json.done) {
            // 流结束，将完整回复加入消息列表，清空流式文本
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
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <Link href={`/dashboard/${kbId}`} className="text-sm text-gray-500 hover:text-gray-900">
          ← 文档管理
        </Link>
        <h1 className="text-base font-semibold text-gray-900">知识库对话</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧会话列表 */}
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
                <span className="text-sm text-gray-700 truncate">{s.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* 右侧对话区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeSession ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              选择或新建一个对话
            </div>
          ) : (
            <>
              {/* 消息列表 */}
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
                    </div>
                  </div>
                ))}
                {/* 流式输出中的 AI 回复 */}
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

              {/* 输入框 */}
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
                  placeholder="输入问题，Enter 发送，Shift+Enter 换行"
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
