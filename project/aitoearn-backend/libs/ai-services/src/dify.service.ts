/**
 * DifyService — Dify AI 平台集成
 *
 * 功能：
 * - 知识库检索 (RAG)
 * - Agent 应用调用
 * - 数据集管理
 * - 对话管理
 */

import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { AppException, ResponseCode } from '@yikart/common'
import { firstValueFrom } from 'rxjs'

// ── 配置接口 ──

export interface DifyConfig {
  /** Dify API 地址，如 http://localhost:5001 */
  apiBase: string
  /** Dify Console API 访问令牌 */
  accessToken: string
  /** 默认超时时间 ms */
  timeout?: number
}

// ── 知识库 ──

export interface DocFragment {
  id: string
  content: string
  score: number
  document_name: string
  dataset_id: string
}

export interface RetrieveParams {
  query: string
  datasetIds: string[]
  topK?: number
  scoreThreshold?: number
}

// ── Agent 应用 ──

export interface RunAgentParams {
  appId: string
  query: string
  inputs?: Record<string, any>
  conversationId?: string
  files?: { type: string; url: string }[]
}

export interface RunAgentResult {
  answer: string
  conversationId: string
  messageId: string
  metadata?: {
    usage?: { total_tokens: number; total_price: string }
    retriever_resources?: any[]
  }
}

// ── 数据集管理 ──

export interface CreateDatasetParams {
  name: string
  description?: string
  indexingTechnique?: 'high_quality' | 'economy'
  permission?: 'only_me' | 'all_team_members'
}

export interface Dataset {
  id: string
  name: string
  description: string
  documentCount: number
  wordCount: number
  createdAt: Date
}

export interface CreateDocumentParams {
  datasetId: string
  name: string
  text: string
  indexingTechnique?: 'high_quality' | 'economy'
  processRule?: { mode: 'automatic' | 'custom'; rules?: Record<string, any> }
}

// ── 服务实现 ──

@Injectable()
export class DifyService {
  private readonly logger = new Logger(DifyService.name)

  constructor(
    private readonly http: HttpService,
    private readonly config: DifyConfig,
  ) {}

  // ── 知识库检索 ──

  /**
   * 从指定知识库中检索相关文档片段
   * 用于 AI 工作流中的 RAG 步骤（策略研究、合规检测等）
   */
  async retrieveKnowledge(params: RetrieveParams): Promise<DocFragment[]> {
    const url = `${this.config.apiBase}/v1/datasets/retrieve`

    try {
      const { data } = await firstValueFrom(
        this.http.post(url, {
          query: params.query,
          dataset_ids: params.datasetIds,
          retrieval_model: {
            search_method: 'semantic_search',
            top_k: params.topK ?? 10,
            score_threshold: params.scoreThreshold ?? 0.5,
            reranking_enable: true,
          },
        }, {
          headers: this.getHeaders(),
          timeout: this.config.timeout ?? 30000,
        }),
      )

      if (!data?.records) {
        return []
      }

      return data.records.map((r: any) => ({
        id: r.segment?.id,
        content: r.segment?.content,
        score: r.score,
        document_name: r.segment?.document?.name,
        dataset_id: r.segment?.dataset?.id,
      }))
    } catch (error: any) {
      this.logger.error(`Dify retrieve failed: ${error.message}`, error.stack)
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'dify',
        action: 'retrieve',
      })
    }
  }

  // ── Agent 应用调用 ──

  /**
   * 调用 Dify Agent 应用（阻塞模式）
   * 用于 AI 工作流中的意图分析、内容生成等步骤
   */
  async runAgentApp(params: RunAgentParams): Promise<RunAgentResult> {
    const url = `${this.config.apiBase}/v1/chat-messages`

    try {
      const body: Record<string, any> = {
        inputs: params.inputs ?? {},
        query: params.query,
        user: 'aibrand-system',
        response_mode: 'blocking',
      }

      if (params.conversationId) {
        body['conversation_id'] = params.conversationId
      }
      if (params.files?.length) {
        body['files'] = params.files
      }

      const { data } = await firstValueFrom(
        this.http.post(url, body, {
          headers: this.getHeaders(),
          timeout: this.config.timeout ?? 120000,
        }),
      )

      return {
        answer: data.answer,
        conversationId: data.conversation_id,
        messageId: data.message_id,
        metadata: data.metadata,
      }
    } catch (error: any) {
      this.logger.error(`Dify agent run failed: ${error.message}`, error.stack)
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'dify',
        action: 'runAgent',
      })
    }
  }

  // ── 数据集管理 ──

  /** 获取所有数据集列表 */
  async listDatasets(page = 1, limit = 50): Promise<{ data: Dataset[]; total: number }> {
    const url = `${this.config.apiBase}/console/api/datasets`
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: { page, limit },
          headers: this.getHeaders(),
        }),
      )
      return {
        data: data.data?.map(this.mapDataset) ?? [],
        total: data.total ?? 0,
      }
    } catch (error: any) {
      this.logger.error(`Dify listDatasets failed: ${error.message}`)
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'dify',
        action: 'listDatasets',
      })
    }
  }

  /** 创建知识库 */
  async createDataset(params: CreateDatasetParams): Promise<Dataset> {
    const url = `${this.config.apiBase}/console/api/datasets`
    try {
      const { data } = await firstValueFrom(
        this.http.post(url, {
          name: params.name,
          description: params.description,
          indexing_technique: params.indexingTechnique ?? 'high_quality',
          permission: params.permission ?? 'only_me',
        }, {
          headers: this.getHeaders(),
        }),
      )
      return this.mapDataset(data)
    } catch (error: any) {
      this.logger.error(`Dify createDataset failed: ${error.message}`)
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'dify',
        action: 'createDataset',
      })
    }
  }

  /** 向知识库添加文档 */
  async createDocument(params: CreateDocumentParams): Promise<{ id: string; name: string }> {
    const url = `${this.config.apiBase}/console/api/datasets/${params.datasetId}/documents`
    try {
      const { data } = await firstValueFrom(
        this.http.post(url, {
          name: params.name,
          text: params.text,
          indexing_technique: params.indexingTechnique ?? 'high_quality',
          process_rule: params.processRule ?? { mode: 'automatic' },
        }, {
          headers: this.getHeaders(),
        }),
      )
      return { id: data.document?.id, name: data.document?.name }
    } catch (error: any) {
      this.logger.error(`Dify createDocument failed: ${error.message}`)
      throw new AppException(ResponseCode.AiCallFailed, {
        service: 'dify',
        action: 'createDocument',
      })
    }
  }

  // ── 健康检查 ──

  /** 检查 Dify API 连接状态 */
  async healthCheck(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get(`${this.config.apiBase}/health`, {
          timeout: 5000,
        }),
      )
      return true
    } catch {
      return false
    }
  }

  // ── 私有方法 ──

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  private mapDataset(raw: any): Dataset {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      documentCount: raw.document_count ?? 0,
      wordCount: raw.word_count ?? 0,
      createdAt: new Date(raw.created_at),
    }
  }
}
