"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import {
  chatApi,
  knowledgeApi,
  type ChatSession,
  type ChatMessage,
  type FeedbackData,
} from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import Markdown from "react-markdown";
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
  Sparkles,
  RefreshCw,
  Bot,
  Sparkles as SparklesIcon,
  AtSign,
  SlidersHorizontal,
  Globe,
  FileText,
  Network,
  Pen,
  Mic,
  MicOff,
} from "lucide-react";

type Mode = "rag" | "agent";

interface ToolCallEvent {
  toolCall: { name: string; input: unknown };
}

const TOOL_LABELS: Record<string, string> = {
  search_knowledge: "检索知识库",
  get_document_list: "获取文档列表",
};

const SKILLS = [
  { id: "mindmap", label: "思维导图", description: "生成知识结构图", icon: Network },
  { id: "summary", label: "文档摘要", description: "总结文档核心内容", icon: FileText },
  { id: "rewrite", label: "改写润色", description: "优化文本表达", icon: Pen },
];

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
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [showSkillsMenu, setShowSkillsMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
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

  async function fetchSuggestedQuestions() {
    setLoadingSuggested(true);
    try {
      const res = await knowledgeApi.getSuggestedQuestions(kbId);
      setSuggestedQuestions(res.data.questions);
    } catch {
      setSuggestedQuestions([]);
    } finally {
      setLoadingSuggested(false);
    }
  }

  useEffect(() => {
    fetchSessions();
    fetchSuggestedQuestions();
  }, [kbId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // 点击外部关闭技能菜单
  useEffect(() => {
    function handleClickOutside() {
      setShowSkillsMenu(false);
    }
    if (showSkillsMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showSkillsMenu]);

  // 语音输入
  function toggleVoiceInput() {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音输入，请使用 Chrome");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput((prev) => {
        // 只追加新增的部分
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          return prev + lastResult[0].transcript;
        }
        return prev;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("语音识别错误:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
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

    const skillPrompt = selectedSkill
      ? `[使用${SKILLS.find((s) => s.id === selectedSkill)?.label}技能] `
      : "";
    const webPrompt = webSearchEnabled ? "[联网搜索] " : "";
    const fullQuestion = `${skillPrompt}${webPrompt}${question}`;

    const body =
      mode === "rag"
        ? { question: fullQuestion }
        : {
            question: fullQuestion,
            sessionId: activeSession,
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
          <ToggleGroup
            value={[mode]}
            onValueChange={(v: string[]) => {
              if (v.length > 0) setMode(v[0] as Mode);
            }}
          >
            {/* <ToggleGroupItem value="rag" className="text-xs">
              RAG 模式
            </ToggleGroupItem>
            <ToggleGroupItem value="agent" className="text-xs">
              Agent 模式
            </ToggleGroupItem> */}
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

        <div className="flex-1 flex flex-col overflow-y-auto">
          {!activeSession ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-lg w-full text-center space-y-6">
                <Sparkles className="size-10 mx-auto text-primary/60" />
                <h3 className="text-lg font-medium text-foreground">
                  猜你想问
                </h3>
                {loadingSuggested ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 rounded-lg bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : suggestedQuestions.length > 0 ? (
                  <div className="space-y-2">
                    {suggestedQuestions.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3 px-4 text-sm whitespace-normal card-hover"
                        onClick={async () => {
                          // 创建新会话，以问题前30字作为标题
                          const res = await chatApi.createSession(
                            kbId,
                            q.slice(0, 30),
                          );
                          setSessions((prev) => [res.data, ...prev]);
                          setActiveSession(res.data.id);
                          setMessages([]);
                          setInput(q);
                        }}
                      >
                        <Sparkles className="size-3.5 mr-2 shrink-0 text-primary/60" />
                        {q}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={fetchSuggestedQuestions}
                    >
                      <RefreshCw className="size-3 mr-1" /> 换一批
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    上传文档后即可生成推荐问题
                  </p>
                )}
              </div>
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
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                            : "bg-background border border-border text-foreground"
                        }`}
                      >
                        {msg.role === "user" ? (
                          msg.content
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <Markdown>{msg.content}</Markdown>
                          </div>
                        )}
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
                      <div className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm bg-background border border-border text-foreground">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Markdown>{streamingText}</Markdown>
                        </div>
                        <span className="inline-block w-1 h-4 bg-muted-foreground ml-0.5 animate-pulse" />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              <div className="shrink-0 p-4 sticky bottom-0">
                <div className="border border-border rounded-2xl bg-background shadow-sm ">
                  {/* 输入区 */}
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="告诉我想做什么，我来规划执行——查询知识、生成PPT、撰写报告、整理知识库......"
                    rows={1}
                    className="w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 pt-4 pb-2 text-sm placeholder:text-muted-foreground/60"
                  />
                  {/* 底部工具栏 */}
                  <div className="flex items-center justify-between px-3 pb-3 pt-1">
                    <div className="flex items-center gap-1 relative">
                      <button
                        onClick={() => setMode(mode === "agent" ? "rag" : "agent")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          mode === "agent"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Bot className="size-3.5" />
                        {mode === "agent" ? "Agent模式" : "RAG模式"}
                      </button>

                      {/* 技能下拉菜单 */}
                      <div className="relative">
                        <button
                          onClick={() => setShowSkillsMenu(!showSkillsMenu)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition ${
                            selectedSkill
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <SparklesIcon className="size-3.5" />
                          技能{selectedSkill ? `: ${SKILLS.find(s => s.id === selectedSkill)?.label}` : ""}
                        </button>
                        {showSkillsMenu && (
                          <div
                            className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-xl shadow-lg p-2 min-w-[200px] z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {SKILLS.map((skill) => (
                              <button
                                key={skill.id}
                                onClick={() => {
                                  setSelectedSkill(selectedSkill === skill.id ? "" : skill.id);
                                  setShowSkillsMenu(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition text-left ${
                                  selectedSkill === skill.id
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted text-foreground"
                                }`}
                              >
                                <skill.icon className="size-4 shrink-0" />
                                <div>
                                  <p className="font-medium">{skill.label}</p>
                                  <p className="text-xs text-muted-foreground">{skill.description}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 联网搜索开关 */}
                      <button
                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition ${
                          webSearchEnabled
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Globe className="size-3.5" />
                        联网搜索
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* 语音输入按钮 */}
                      <button
                        onClick={toggleVoiceInput}
                        className={`p-2 rounded-full transition ${
                          isRecording
                            ? "bg-red-500 text-white animate-pulse"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        title={isRecording ? "停止录音" : "语音输入"}
                      >
                        {isRecording ? (
                          <MicOff className="size-4" />
                        ) : (
                          <Mic className="size-4" />
                        )}
                      </button>
                      <button
                        onClick={sendMessage}
                        disabled={streaming || !input.trim()}
                        className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {streaming ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
