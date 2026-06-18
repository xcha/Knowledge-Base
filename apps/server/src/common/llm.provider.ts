import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Response } from 'express';

/** 默认模型 */
const DEFAULT_MODEL = 'mimo-v2.5';

/** 创建 LLM 实例（默认使用 mimo-v2.5） */
export function createLlm(_modelName?: string): BaseChatModel {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  // DeepSeek
  if (model.startsWith('deepseek')) {
    return new ChatOpenAI({
      openAIApiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
      model,
      configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      },
    });
  }

  // OpenAI
  if (model.startsWith('gpt')) {
    return new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      model,
    });
  }

  // 默认：通过 Anthropic 兼容接口调用（支持 mimo、claude 等）
  return new ChatAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model,
    clientOptions: {
      baseURL: process.env.ANTHROPIC_BASE_URL,
      defaultHeaders: {
        Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
      },
    },
  });
}

/** 兼容旧接口 */
export function createClaudeLlm(): BaseChatModel {
  return createLlm();
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
