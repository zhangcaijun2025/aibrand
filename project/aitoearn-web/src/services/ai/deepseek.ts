/**
 * DeepSeek AI Adapter
 *
 * OpenAI 兼容格式，支持 deepseek-chat (V3) 和 deepseek-reasoner (R1)
 * 用于全域运营工作台的内容诊断、优化建议、数据解读
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

interface ChatResponse {
  content: string
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/** 调用 DeepSeek Chat API */
export async function deepseekChat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResponse> {
  const {
    model = process.env.DEEPSEEK_MODEL_CHAT || 'deepseek-chat',
    temperature = 0.7,
    max_tokens = 4096,
  } = options

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }
}

/** 调用 DeepSeek R1 推理模型（深度思考） */
export async function deepseekReason(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResponse> {
  return deepseekChat(messages, {
    ...options,
    model: process.env.DEEPSEEK_MODEL_REASONER || 'deepseek-reasoner',
    temperature: 0.3, // R1 推荐低温度
    max_tokens: options.max_tokens || 8192,
  })
}

/** 快速对话（V3，推荐用于诊断分析、数据解读） */
export async function deepseekQuick(
  systemPrompt: string,
  userMessage: string,
  options?: ChatOptions,
): Promise<ChatResponse> {
  return deepseekChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    { temperature: 0.5, max_tokens: 2048, ...options },
  )
}

/** 深度推理（R1，推荐用于优化方案生成、复杂决策） */
export async function deepseekThink(
  systemPrompt: string,
  userMessage: string,
  options?: ChatOptions,
): Promise<ChatResponse> {
  return deepseekReason(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    { ...options },
  )
}
