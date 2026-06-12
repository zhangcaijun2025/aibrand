/**
 * AiBrand Extension v3 — Pre-Send Confirmation Dialog
 *
 * Shown BEFORE content is published. Displays:
 * - Content summary (title, type, preview)
 * - Target platforms
 * - AI-driven suggestions (best time, content tips, GEO score)
 * - Confirmation actions (Send Now / Schedule / Edit / Cancel)
 */

import { useState, useEffect } from 'react';
import { MessageBox, PlatformBadge } from './MessageBox';
import type { NewTaskPayload, QualityVerdictPayload } from '@/shared/types';

// ─── Types ────────────────────────────────────────────────────────────────

interface AiSuggestion {
  bestTimes: { platform: string; time: string; reason: string }[];
  contentTips: { severity: 'tip' | 'warning' | 'critical'; message: string }[];
  geoScore?: { score: number; label: string; suggestions: string[] };
  hashtagSuggestions: string[];
  readiness: 'ready' | 'needs_review' | 'not_ready';
  readinessMessage: string;
}

interface PreSendConfirmProps {
  task: NewTaskPayload;
  visible: boolean;
  onConfirm: () => void;
  onSchedule: () => void;
  onEdit: () => void;
  onCancel: () => void;
  suggestions?: AiSuggestion;
  suggestionsLoading?: boolean;
  /** Quality verdict from backend Agent (if pre-reviewed) */
  qualityVerdict?: QualityVerdictPayload;
}

// ─── Component ────────────────────────────────────────────────────────────

export function PreSendConfirm({
  task,
  visible,
  onConfirm,
  onSchedule,
  onEdit,
  onCancel,
  suggestions,
  suggestionsLoading,
}: PreSendConfirmProps) {
  const [countdown, setCountdown] = useState(5);
  const [canSend, setCanSend] = useState(false);

  // Auto-confirm cooldown (prevents accidental clicks)
  useEffect(() => {
    if (!visible) {
      setCountdown(5);
      setCanSend(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  const content = task.content;
  const quality = qualityVerdict;

  return (
    <MessageBox
      variant="confirm"
      title="Ready to Publish?"
      subtitle={
        `${task.platforms.length} platforms · ${content.type}` +
        (quality ? ` · 质检 ${quality.overallScore}分` : '')
      }
      visible={visible}
      onDismiss={onCancel}
      actions={
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-md text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs rounded-md bg-surface-overlay text-white/60 hover:text-white hover:bg-surface-border transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={onSchedule}
            className="px-3 py-1.5 text-xs rounded-md bg-surface-overlay text-white/60 hover:text-white hover:bg-surface-border transition-colors"
          >
            🕐 Schedule
          </button>
          <button
            onClick={onConfirm}
            disabled={!canSend}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
              canSend
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25'
                : 'bg-surface-overlay text-white/30 cursor-not-allowed'
            }`}
          >
            {canSend ? '🚀 Send Now' : `Wait ${countdown}s`}
          </button>
        </div>
      }
    >
      {/* Quality Badge (if pre-reviewed by Content Factory) */}
      {quality && (
        <div className={`p-2.5 rounded-md flex items-center gap-3 ${
          quality.passed ? 'bg-green-950/20 border border-green-800/20' : 'bg-red-950/20 border border-red-800/20'
        }`}>
          <span className="text-lg">{quality.passed ? '✅' : '⚠️'}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${quality.passed ? 'text-green-300' : 'text-red-300'}`}>
              {quality.passed ? '质量认证通过' : '质量认证未通过'}
            </p>
            <p className="text-[11px] text-white/40">
              质量总监 · {quality.overallScore}分 · {quality.dimensions.filter(d => d.status === 'passed').length}/{quality.dimensions.length} 项通过
            </p>
          </div>
          <div className={`text-lg font-bold ${quality.overallScore >= 80 ? 'text-green-400' : 'text-red-400'}`}>
            {quality.overallScore}
          </div>
        </div>
      )}

      {/* Content Summary */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wider text-white/40">
          Content
        </h4>
        <div className="p-3 rounded-md bg-surface/50 border border-white/5">
          <p className="text-sm font-medium text-white/90 line-clamp-1">
            {content.title || '(No title)'}
          </p>
          <p className="mt-1 text-xs text-white/40 line-clamp-2">
            {content.content?.slice(0, 120) || content.digest?.slice(0, 120) || '(No content preview)'}
          </p>
          {content.tags && content.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {content.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-surface-overlay text-white/40"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Target Platforms */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wider text-white/40">
          Target Platforms
        </h4>
        <div className="flex gap-1.5 flex-wrap">
          {task.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} status="pending" />
          ))}
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wider text-white/40">
          AI Suggestions
          {suggestionsLoading && (
            <span className="ml-2 text-brand-400 animate-pulse">Analyzing...</span>
          )}
        </h4>

        {suggestions ? (
          <div className="space-y-2">
            {/* GEO Score */}
            {suggestions.geoScore && (
              <div className="flex items-center gap-3 p-2.5 rounded-md bg-surface/50 border border-white/5">
                <div
                  className={`text-lg font-bold ${
                    suggestions.geoScore.score >= 80
                      ? 'text-green-400'
                      : suggestions.geoScore.score >= 60
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}
                >
                  {suggestions.geoScore.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/70">
                    GEO Score: {suggestions.geoScore.label}
                  </p>
                  <p className="text-[11px] text-white/40 truncate">
                    {suggestions.geoScore.suggestions[0]}
                  </p>
                </div>
              </div>
            )}

            {/* Best Times */}
            {suggestions.bestTimes.length > 0 && (
              <div className="p-2.5 rounded-md bg-surface/50 border border-white/5 space-y-1.5">
                <p className="text-xs font-medium text-amber-300/80">
                  🕐 Best Publish Times
                </p>
                {suggestions.bestTimes.map((bt) => (
                  <div
                    key={bt.platform}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-white/50">{bt.platform}</span>
                    <span className="text-amber-300/70 font-mono">
                      {bt.time}
                    </span>
                    <span className="text-white/30 text-[11px]">{bt.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Content Tips */}
            {suggestions.contentTips.length > 0 && (
              <div className="space-y-1">
                {suggestions.contentTips.map((tip, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2 rounded-md text-xs ${
                      tip.severity === 'critical'
                        ? 'bg-red-950/30 border border-red-800/20 text-red-300'
                        : tip.severity === 'warning'
                          ? 'bg-amber-950/30 border border-amber-800/20 text-amber-300'
                          : 'bg-surface/50 border border-white/5 text-white/50'
                    }`}
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      {tip.severity === 'critical' ? '🔴' : tip.severity === 'warning' ? '🟡' : '💡'}
                    </span>
                    <span>{tip.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hashtag Suggestions */}
            {suggestions.hashtagSuggestions.length > 0 && (
              <div className="p-2.5 rounded-md bg-surface/50 border border-white/5">
                <p className="text-xs font-medium text-blue-300/80 mb-1.5">
                  #️⃣ Recommended Hashtags
                </p>
                <div className="flex gap-1 flex-wrap">
                  {suggestions.hashtagSuggestions.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-blue-900/20 text-blue-300/70 border border-blue-800/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Readiness */}
            <div
              className={`p-2.5 rounded-md text-xs font-medium ${
                suggestions.readiness === 'ready'
                  ? 'bg-green-950/30 border border-green-800/20 text-green-300'
                  : suggestions.readiness === 'needs_review'
                    ? 'bg-amber-950/30 border border-amber-800/20 text-amber-300'
                    : 'bg-red-950/30 border border-red-800/20 text-red-300'
              }`}
            >
              {suggestions.readiness === 'ready' ? '✅' : suggestions.readiness === 'needs_review' ? '⚠️' : '🚫'}{' '}
              {suggestions.readinessMessage}
            </div>
          </div>
        ) : suggestionsLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-xs text-white/30">
              <div className="w-3 h-3 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
              Analyzing content and timing...
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/30 italic">
            AI suggestions will appear here once content is analyzed
          </p>
        )}
      </div>
    </MessageBox>
  );
}
