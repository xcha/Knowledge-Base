import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Response } from 'express';

export type ModelProvider = 'claude' | 'openai' | 'deepseek';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  label: string;
}

// 支持的模型列表
export const AVAILABLE_MODELS: ModelConfig[] = [
  { provider: 'claude', model: 'claude-sonnet-4-6', label: 'Claude Sonnet' },
  {
    provider: 'claude',
    model: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku',
  },
  { provider: 'openai', model: 'gpt-4o', label: 'GPT-4o' },
  { provider: 'openai', model: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { provider: 'deepseek', model: 'deepseek-chat', label: 'DeepSeek V3' },
];

/** 根据模型名称创建 LLM 实例 */
export function createLlm(modelName?: string): BaseChatModel {
  const model = modelName || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  // DeepSeek（兼容 OpenAI 接口）
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

  // Claude（默认）
  return new ChatAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model,
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
