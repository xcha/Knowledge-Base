"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import {
  chatApi,
  type ChatSession,
  type ChatMessage,
  type FeedbackData,
  type ModelInfo,
} from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ArrowLeft,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Send,
  Trash2,
  Loader2,
  Wrench,
  Download,
} from "lucide-react";

type Mode = "rag" | "agent";

interface ToolCallEvent {
  toolCall: { name: string; input: unknown };
}

const TOOL_LABELS: Record<string, string> = {
  search_knowledge: "检索知识库",
  get_document_list: "获取文档列表",
};

export default function ChatPage({
  params,
}: {
  params: Promise<{ kbId: string }>;
}) {
  const { kbId } = use(params);
  const token = useAuthStore((s) => s.accessToken);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("rag");
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackData>>(
    {},
  );
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function selectSession(sessionId: string) {
    setActiveSession(sessionId);
    const res = await chatApi.getMessages(kbId, sessionId);
    setMessages(res.data);
  }

  async function fetchSessions() {
    const res = await chatApi.listSessions(kbId);
    setSessions(res.data);
    if (res.data.length > 0 && !activeSession) {
      selectSession(res.data[0].id);
    }
  }

  async function fetchModels() {
    try {
      const res = await chatApi.getModels(kbId);
      setModels(res.data);
      if (res.data.length > 0 && !selectedModel) {
        setSelectedModel(res.data[0].model);
      }
    } catch {
      // 静默失败，使用默认模型
    }
  }

  useEffect(() => {
    fetchSessions();
    fetchModels();
  }, [kbId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

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

  async function handleFeedback(msgId: string, type: "like" | "dislike") {
    if (!activeSession) return;
    try {
      await chatApi.feedbackMessage(kbId, activeSession, msgId, type);
      const fb = await chatApi.getFeedback(kbId, activeSession, msgId);
      setFeedbackMap((prev) => ({ ...prev, [msgId]: fb.data }));
    } catch {
      /* ignore */
    }
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
    setInput("");
    setStreaming(true);
    setStreamingText("");
    setActiveToolCall(null);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api";
    const url =
      mode === "rag"
        ? `${base}/knowledge/${kbId}/sessions/${activeSession}/chat`
        : `${base}/knowledge/${kbId}/agent/chat`;

    const body =
      mode === "rag"
        ? { question, model: selectedModel || undefined }
        : {
            question,
            sessionId: activeSession,
            model: selectedModel || undefined,
          };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.body) throw new Error("响应体为空");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

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
              role: "assistant",
              content: aiText,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, aiMsg]);
            setStreamingText("");
          }
        }
      }
    } catch {
      setStreamingText("");
    } finally {
      setStreaming(false);
      setActiveToolCall(null);
    }
  }

  function exportChat(format: "markdown" | "txt") {
    if (messages.length === 0) return;

    const sessionTitle =
      sessions.find((s) => s.id === activeSession)?.title || "对话记录";
    const timestamp = new Date().toLocaleString("zh-CN");

    let content = `# ${sessionTitle}\n\n导出时间：${timestamp}\n\n---\n\n`;

    messages.forEach((msg) => {
      const role = msg.role === "user" ? "👤 用户" : "🤖 AI";
      content += `### ${role}\n\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sessionTitle}.${format === "markdown" ? "md" : "txt"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      <header className="bg-background border-b border-border px-6 py-3 flex items-center gap-4 shrink-0">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/${kbId}`}>
            <ArrowLeft className="size-4" /> 文档管理
          </Link>
        </Button>
        <h1 className="text-base font-semibold text-foreground">知识库对话</h1>

        <div className="ml-auto flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportChat("markdown")}
            >
              <Download className="size-4" /> 导出
            </Button>
          )}
          {models.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="h-8 px-2 text-xs rounded-md border border-border bg-background text-foreground"
            >
              {models.map((m) => (
                <option key={m.model} value={m.model}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          <ToggleGroup
            value={[mode]}
            onValueChange={(v: string[]) => {
              if (v.length > 0) setMode(v[0] as Mode);
            }}
          >
            <ToggleGroupItem value="rag" className="text-xs">
              RAG 模式
            </ToggleGroupItem>
            <ToggleGroupItem value="agent" className="text-xs">
              Agent 模式
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-background border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <Button onClick={createSession} className="w-full" size="sm">
              <Plus className="size-4" /> 新对话
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`px-3 py-2.5 cursor-pointer flex items-center justify-between group hover:bg-muted/50 transition ${
                  activeSession === s.id
                    ? "bg-primary/5 border-r-2 border-primary"
                    : ""
                }`}
              >
                {editingSessionId === s.id ? (
                  <Input
                    autoFocus
                    value={editingSessionTitle}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditingSessionTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSession(s.id);
                      if (e.key === "Escape") setEditingSessionId(null);
                    }}
                    onBlur={() => setEditingSessionId(null)}
                    className="h-6 text-sm"
                  />
                ) : (
                  <span
                    className="text-sm text-foreground truncate cursor-pointer hover:text-primary"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(s.id);
                      setEditingSessionTitle(s.title);
                    }}
                  >
                    {s.title}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition h-6 w-6 p-0"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </ScrollArea>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeSession ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              选择或新建一个对话
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border border-border text-foreground"
                        }`}
                      >
                        {msg.content}
                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(msg.id, "like")}
                              className={`h-6 text-xs px-2 ${feedbackMap[msg.id]?.likes ? "text-green-600" : "text-muted-foreground"}`}
                            >
                              <ThumbsUp className="size-3" />{" "}
                              {feedbackMap[msg.id]?.likes || ""}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(msg.id, "dislike")}
                              className={`h-6 text-xs px-2 ${feedbackMap[msg.id]?.dislikes ? "text-destructive" : "text-muted-foreground"}`}
                            >
                              <ThumbsDown className="size-3" />{" "}
                              {feedbackMap[msg.id]?.dislikes || ""}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {streaming && !streamingText && !activeToolCall && (
                    <div className="flex justify-start">
                      <div className="bg-background border border-border rounded-2xl px-5 py-4 max-w-[70%] space-y-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">
                            正在思考
                          </span>
                        </div>
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  )}

                  {activeToolCall && (
                    <div className="flex justify-start">
                      <div className="bg-background border border-border rounded-2xl px-5 py-4 max-w-[70%] space-y-3">
                        <div className="flex items-center gap-2">
                          <Wrench className="size-4 animate-pulse text-amber-500" />
                          <Badge variant="secondary" className="text-xs">
                            正在{activeToolCall}
                          </Badge>
                        </div>
                        <Skeleton className="h-3 w-48 bg-amber-50" />
                        <Skeleton className="h-3 w-32 bg-amber-50" />
                      </div>
                    </div>
                  )}

                  {streamingText && (
                    <div className="flex justify-start">
                      <div className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm bg-background border border-border text-foreground whitespace-pre-wrap">
                        {streamingText}
                        <span className="inline-block w-1 h-4 bg-muted-foreground ml-0.5 animate-pulse" />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-border bg-background px-4 py-3 flex gap-2 shrink-0">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    mode === "agent"
                      ? "Agent 模式：AI 会自主决定是否检索知识库"
                      : "输入问题，Enter 发送，Shift+Enter 换行"
                  }
                  rows={1}
                  className="flex-1 resize-none"
                />
                <Button
                  onClick={sendMessage}
                  disabled={streaming || !input.trim()}
                >
                  {streaming ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {streaming ? "" : "发送"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
