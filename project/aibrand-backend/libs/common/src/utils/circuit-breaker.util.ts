/**
 * CircuitBreaker — 通用熔断器
 *
 * 用于保护外部 API 调用（Dify、n8n、社交平台 API 等），
 * 连续失败达到阈值后熔断，避免雪崩效应。
 *
 * 用法：
 *   const breaker = new CircuitBreaker('dify', 5, 30000)
 *   const result = await breaker.call(() => fetchExternalApi())
 */

export class CircuitBreaker {
  private failures = 0
  private openedAt = 0
  private readonly threshold: number
  private readonly resetTimeout: number
  private readonly name: string

  /**
   * @param name 熔断器名称（用于日志标识）
   * @param threshold 连续失败阈值，默认 5 次
   * @param resetTimeout 熔断恢复时间 ms，默认 30s
   */
  constructor(name: string, threshold = 5, resetTimeout = 30_000) {
    this.name = name
    this.threshold = threshold
    this.resetTimeout = resetTimeout
  }

  /** 当前是否处于熔断状态 */
  get isOpen(): boolean {
    if (this.failures < this.threshold) return false
    if (Date.now() - this.openedAt > this.resetTimeout) {
      this.failures = 0 // 半开状态：允许下一次请求
      return false
    }
    return true
  }

  /** 记录一次成功调用（重置计数器） */
  recordSuccess(): void {
    if (this.failures > 0) {
      console.log(`[CircuitBreaker:${this.name}] Closed — recovered`)
    }
    this.failures = 0
  }

  /** 记录一次失败调用（递增计数器，达到阈值后熔断） */
  recordFailure(): void {
    this.failures++
    if (this.failures >= this.threshold) {
      this.openedAt = Date.now()
      console.warn(
        `[CircuitBreaker:${this.name}] OPEN — ${this.failures} failures, ` +
        `cooling down ${this.resetTimeout / 1000}s`,
      )
    }
  }

  /**
   * 执行受保护的操作
   * @param fn 异步操作
   * @returns 操作结果
   * @throws 熔断时抛出 Error('Circuit breaker open for <name>')
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      throw new Error(`Circuit breaker open for ${this.name}`)
    }
    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (err) {
      this.recordFailure()
      throw err
    }
  }
}
