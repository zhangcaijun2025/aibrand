/**
 * AiBrand Extension v3 — Quality Gate UI (streaming)
 *
 * Renders the quality review progress streaming from the backend Agent.
 *
 * Three visual states:
 *   1. "已认证" badge — pre-qualified content from Content Factory (95%)
 *   2. Streaming review — real-time dimension-by-dimension check
 *   3. Verdict result — pass (auto-proceed) or fail (show fixes)
 */

import { useEffect, useState, useCallback } from 'react';
import { getQualityGate } from '@/core/quality-gate';
import type {
  QualityCheckStartedPayload,
  QualityDimResultPayload,
  QualityVerdictPayload,
  QualityDimension,
} from '@/shared/types';
import type { NewTaskPayload } from '@/shared/types';

// ─── Props ────────────────────────────────────────────────────────────────

interface QualityGateProps {
  task: NewTaskPayload;
  visible: boolean;
  /** Called when quality passes — parent transitions to confirm phase */
  onPass: (verdict: QualityVerdictPayload) => void;
  /** Called when quality fails — parent shows suggestions, user can edit */
  onFail: (verdict: QualityVerdictPayload) => void;
  /** User chose to edit content and re-check */
  onEditRetry: () => void;
}

// ─── Dimension Config ─────────────────────────────────────────────────────

const DIM_META: Record<QualityDimension, { label: string; icon: string }> = {
  content:     { label: '内容质量',   icon: '📝' },
  geo:         { label: 'GEO 优化',   icon: '🌐' },
  compliance:  { label: '平台合规',   icon: '🛡️' },
  originality: { label: '原创度',     icon: '🔍' },
};

// ─── Component ────────────────────────────────────────────────────────────

export function QualityGateCheck({ task, visible, onPass, onFail, onEditRetry }: QualityGateProps) {
  const [phase, setPhase] = useState<'idle' | 'checking' | 'complete'>('idle');
  const [started, setStarted] = useState<QualityCheckStartedPayload | null>(null);
  const [dimResults, setDimResults] = useState<QualityDimResultPayload[]>([]);
  const [verdict, setVerdict] = useState<QualityVerdictPayload | null>(null);
  const [expandedDim, setExpandedDim] = useState<QualityDimension | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // ─── Start ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible || phase !== 'idle') return;

    const gate = getQualityGate();

    // Path A: Pre-qualified content from Content Factory
    const preReview = gate.getPreReview(task);
    if (preReview) {
      setPhase('checking');
      const startTime = Date.now();
      const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 100);

      gate.streamPreReview(preReview, {
        onStarted: (s) => setStarted(s),
        onDimensionResult: (d) => setDimResults(prev => [...prev, d]),
        onVerdict: (v) => {
          clearInterval(timer);
          setVerdict(v);
          setPhase('complete');
          setTimeout(() => v.passed ? onPass(v) : onFail(v), 1000);
        },
        onError: (err) => {
          clearInterval(timer);
          setPhase('complete');
          console.error('[QualityGate] Stream error:', err);
        },
      });
      return () => clearInterval(timer);
    }

    // Path B: No pre-review — request live check from backend
    setPhase('checking');
    const startTime = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 100);

    const sent = gate.requestCheck(task);
    if (!sent) {
      setPhase('complete');
      console.error('[QualityGate] Failed to send check request — WS not connected');
      return () => clearInterval(timer);
    }

    // Listen for WS events (these are wired in the parent sidepanel)
    const wsEventListener = (event: Event) => {
      const { eventType, payload } = (event as CustomEvent).detail;
      gate.handleWsEvent(eventType, payload, {
        onStarted: (s) => setStarted(s),
        onDimensionResult: (d) => setDimResults(prev => [...prev, d]),
        onVerdict: (v) => {
          clearInterval(timer);
          setVerdict(v);
          setPhase('complete');
          setTimeout(() => v.passed ? onPass(v) : onFail(v), 1000);
        },
        onError: (err) => {
          clearInterval(timer);
          setPhase('complete');
          console.error('[QualityGate] Check error:', err);
        },
      });
    };

    window.addEventListener('aibrand-quality-event', wsEventListener);
    return () => {
      clearInterval(timer);
      window.removeEventListener('aibrand-quality-event', wsEventListener);
    };
  }, [visible, phase, task, onPass, onFail]);

  const toggleDetail = useCallback((dim: QualityDimension) => {
    setExpandedDim(prev => prev === dim ? null : dim);
  }, []);

  if (!visible) return null;

  const currentDims = started?.dimensions ?? [];

  return (
    <div className="rounded-lg border border-brand-600/20 bg-brand-950/30 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 bg-brand-950/50">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🛡️</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-brand-300">
              {phase === 'checking'
                ? `质量总监 审核中 · ${elapsed}s`
                : verdict?.passed
                  ? '✅ 质检通过 · 进入发送确认'
                  : '质检结果'}
            </h3>
            <p className="text-xs text-white/40 mt-0.5">
              {verdict
                ? `总分 ${verdict.overallScore} · 阈值 ${verdict.threshold}`
                : '正在逐项检查内容质量、GEO、合规、原创度'}
            </p>
          </div>
          {verdict && (
            <div className={`text-2xl font-bold tabular-nums ${
              verdict.overallScore >= 80 ? 'text-green-400' :
              verdict.overallScore >= 60 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {verdict.overallScore}
            </div>
          )}
        </div>
      </div>

      {/* Dimensions (4 rows) */}
      <div className="px-4 py-3 space-y-1.5">
        {currentDims.map((dimKey) => {
          const meta = DIM_META[dimKey];
          const result = dimResults.find(d => d.dimension === dimKey);
          const isChecking = !result && dimResults.length < currentDims.length;
          const isExpanded = expandedDim === dimKey;

          return (
            <div key={dimKey}>
              <button
                onClick={() => result && toggleDetail(dimKey)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-md transition-all duration-300 ${
                  result
                    ? result.status === 'passed'
                      ? 'bg-green-950/20 border border-green-800/20 cursor-pointer hover:brightness-110'
                      : result.status === 'warning'
                        ? 'bg-amber-950/20 border border-amber-800/20 cursor-pointer hover:brightness-110'
                        : 'bg-red-950/20 border border-red-800/20 cursor-pointer hover:brightness-110'
                    : isChecking
                      ? 'bg-brand-600/10 border border-brand-500/30'
                      : 'bg-surface/30 border border-white/5'
                }`}
                disabled={!result}
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {isChecking && !result ? (
                    <div className="w-5 h-5 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
                  ) : result ? (
                    <span className={result.status === 'passed' ? 'text-green-400' : result.status === 'warning' ? 'text-amber-400' : 'text-red-400'}>
                      {result.status === 'passed' ? <CheckIcon /> : result.status === 'warning' ? <WarnIcon /> : <FailIcon />}
                    </span>
                  ) : (
                    <span className="text-white/20 text-lg">{meta.icon}</span>
                  )}
                </div>

                {/* Label + Score */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${
                      isChecking && !result ? 'text-brand-300' :
                      result?.status === 'passed' ? 'text-green-300' :
                      result?.status === 'warning' ? 'text-amber-300' :
                      result?.status === 'failed' ? 'text-red-300' : 'text-white/30'
                    }`}>
                      {meta.icon} {meta.label}
                    </span>
                    {result ? (
                      <span className={`text-xs font-mono font-bold ${
                        result.status === 'passed' ? 'text-green-400' :
                        result.status === 'warning' ? 'text-amber-400' : 'text-red-400'
                      }`}>{result.score}</span>
                    ) : (
                      <span className="text-xs text-white/10 font-mono">--</span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {isChecking && !result ? '检查中...' : result?.message ?? '等待中'}
                  </p>
                  {isChecking && !result && (
                    <div className="mt-1.5 w-full h-1 rounded-full bg-surface overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full animate-pulse w-3/4" />
                    </div>
                  )}
                </div>

                {result && result.details && result.details.length > 0 && (
                  <span className="flex-shrink-0 text-white/20 text-xs">{isExpanded ? '▲' : '▼'}</span>
                )}
              </button>

              {isExpanded && result?.details && (
                <div className="ml-11 mt-1 mb-2 p-2.5 rounded-md bg-surface/50 border border-white/5 space-y-1 animate-slide-up">
                  {result.details.map((d, i) => (
                    <p key={i} className="text-[11px] text-white/50 flex items-start gap-1.5">
                      <span className="text-white/20 flex-shrink-0 mt-0.5">•</span>
                      {d}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Verdict Actions */}
      {phase === 'complete' && verdict && (
        <div className="px-4 py-3 border-t border-white/5 bg-surface/30 space-y-2">
          {verdict.suggestions.length > 0 && (
            <div className="space-y-1 mb-2">
              {verdict.suggestions.map((s, i) => (
                <p key={i} className="text-[11px] text-white/60 flex items-start gap-1.5">
                  <span className="flex-shrink-0 mt-0.5 text-white/20">•</span>
                  {s}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {!verdict.passed && (
              <button
                onClick={onEditRetry}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded-md bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-800/20 transition-colors"
              >
                ✏️ 修改后重新质检
              </button>
            )}
            {verdict.passed ? (
              <div className="flex-1 px-3 py-2 text-xs font-semibold rounded-md bg-green-600/20 text-green-300 border border-green-800/20 text-center animate-pulse">
                ✅ 自动进入发送确认...
              </div>
            ) : (
              <p className="flex-1 text-[11px] text-white/30 italic text-center py-2">
                修改达到 {verdict.threshold} 分以上即可发送
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────

function CheckIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>;
}
function WarnIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9.66 16.5H2.34L12 3z" />
  </svg>;
}
function FailIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>;
}
