import { ChatAnthropic } from '@langchain/anthropic';
import type { Response } from 'express';

/** 创建统一的 Claude LLM 实例 */
export function createClaudeLlm(): ChatAnthropic {
  return new ChatAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    clientOptions: {
      baseURL: process.env.ANTHROPIC_BASE_URL,
      defaultHeaders: {
        Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
      },
    },
  });
}

/** 设置 SSE 响应头 */
export function setupSseHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

/** 发送 SSE 事件 */
export function sendSse(res: Response, data: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
