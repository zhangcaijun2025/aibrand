/**
 * AiBrand Extension v3 — Post-Send Feedback Panel
 *
 * Shown AFTER content is published. Displays:
 * - Per-platform result (success / failure)
 * - Failure reasons with error categorization
 * - AI improvement suggestions for failed platforms
 * - Quick actions (Retry / Edit & Retry / Dismiss)
 */

import { useState } from 'react';
import { MessageBox, PlatformBadge } from './MessageBox';
import type { PlatformResult } from '@/shared/types';

// ─── Types ────────────────────────────────────────────────────────────────

interface PostSendFeedbackProps {
  taskId: string;
  contentTitle: string;
  results: PlatformResult[];
  visible: boolean;
  onRetry: (platforms: string[]) => void;
  onRetryAll: () => void;
  onEditRetry: () => void;
  onDismiss: () => void;
}

// ─── Error Categorization ─────────────────────────────────────────────────

interface CategorizedError {
  platform: string;
  category: 'auth' | 'network' | 'content' | 'platform' | 'media' | 'unknown';
  message: string;
  suggestion: string;
}

function categorizeError(platform: string, error?: string): CategorizedError {
  const msg = error ?? 'Unknown error';
  const lower = msg.toLowerCase();

  if (lower.includes('login') || lower.includes('auth') || lower.includes('token') || lower.includes('session')) {
    return {
      platform,
      category: 'auth',
      message: msg,
      suggestion: 'Re-login to this platform and try again',
    };
  }

  if (lower.includes('network') || lower.includes('timeout') || lower.includes('connection') || lower.includes('dns')) {
    return {
      platform,
      category: 'network',
      message: msg,
      suggestion: 'Check your network connection and retry',
    };
  }

  if (lower.includes('violation') || lower.includes('sensitive') || lower.includes('banned') || lower.includes('prohibited') || lower.includes('blocked')) {
    return {
      platform,
      category: 'content',
      message: msg,
      suggestion: 'Review content for platform compliance. Remove sensitive keywords and retry.',
    };
  }

  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('throttle') || lower.includes('captcha')) {
    return {
      platform,
      category: 'platform',
      message: msg,
      suggestion: 'Platform rate-limited. Wait 5-10 minutes before retrying.',
    };
  }

  if (lower.includes('image') || lower.includes('video') || lower.includes('media') || lower.includes('file') || lower.includes('upload') || lower.includes('format')) {
    return {
      platform,
      category: 'media',
      message: msg,
      suggestion: 'Check media file format and size. Re-upload and retry.',
    };
  }

  return {
    platform,
    category: 'unknown',
    message: msg,
    suggestion: 'Review the error details and try again, or try publishing manually.',
  };
}

// ─── Component ────────────────────────────────────────────────────────────

export function PostSendFeedback({
  taskId,
  contentTitle,
  results,
  visible,
  onRetry,
  onRetryAll,
  onEditRetry,
  onDismiss,
}: PostSendFeedbackProps) {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;
  const allSuccess = failCount === 0;
  const categorized = results
    .filter((r) => !r.success)
    .map((r) => categorizeError(r.platform, r.error));

  return (
    <MessageBox
      variant={allSuccess ? 'success' : failCount === results.length ? 'error' : 'warning'}
      title={
        allSuccess
          ? 'All Published Successfully!'
          : `${successCount}/${results.length} Published`
      }
      subtitle={`Task: ${taskId}`}
      visible={visible}
      onDismiss={onDismiss}
      actions={
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs rounded-md text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            Dismiss
          </button>
          {!allSuccess && (
            <>
              <button
                onClick={() => onRetry(results.filter((r) => !r.success).map((r) => r.platform))}
                className="px-3 py-1.5 text-xs rounded-md bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-800/20 transition-colors"
              >
                🔄 Retry Failed ({failCount})
              </button>
              <button
                onClick={onEditRetry}
                className="px-3 py-1.5 text-xs rounded-md bg-surface-overlay text-white/60 hover:text-white hover:bg-surface-border transition-colors"
              >
                ✏️ Edit & Retry
              </button>
            </>
          )}
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2 text-sm font-semibold rounded-md bg-brand-600 hover:bg-brand-500 text-white transition-colors"
          >
            {allSuccess ? '🎉 Great!' : 'OK'}
          </button>
        </div>
      }
    >
      {/* Content title */}
      <p className="text-xs text-white/50 truncate">"{contentTitle}"</p>

      {/* Per-Platform Results */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wider text-white/40">
          Results
        </h4>
        <div className="space-y-1.5">
          {results.map((result) => (
            <div key={result.platform}>
              <button
                onClick={() =>
                  setExpandedPlatform(
                    expandedPlatform === result.platform ? null : result.platform,
                  )
                }
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-white/5 transition-colors text-left"
              >
                <span className="flex-shrink-0 text-sm">
                  {result.success ? '✅' : '❌'}
                </span>
                <span className="flex-1 text-xs font-medium text-white/70">
                  {result.platform}
                </span>
                {result.success ? (
                  result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      className="text-[10px] text-brand-400 hover:underline truncate max-w-[120px]"
                      onClick={(e) => e.stopPropagation()}
                      rel="noreferrer"
                    >
                      View →
                    </a>
                  )
                ) : (
                  <span className="text-[10px] text-red-400">
                    {expandedPlatform === result.platform ? '▲' : '▼'} Details
                  </span>
                )}
              </button>

              {/* Expanded error details */}
              {!result.success && expandedPlatform === result.platform && (
                <div className="ml-7 mb-1 p-2.5 rounded-md bg-surface/50 border border-white/5 space-y-1.5 animate-slide-up">
                  {(() => {
                    const cat = categorizeError(result.platform, result.error);
                    const categoryConfig = {
                      auth: { label: 'Auth Issue', color: 'text-amber-400', icon: '🔑' },
                      network: { label: 'Network Error', color: 'text-red-400', icon: '🌐' },
                      content: { label: 'Content Violation', color: 'text-red-400', icon: '📝' },
                      platform: { label: 'Platform Limit', color: 'text-amber-400', icon: '🚦' },
                      media: { label: 'Media Error', color: 'text-amber-400', icon: '🖼️' },
                      unknown: { label: 'Unknown Error', color: 'text-white/50', icon: '❓' },
                    };
                    const cfg = categoryConfig[cat.category];

                    return (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span>{cfg.icon}</span>
                          <span className={`text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 break-words">
                          {cat.message}
                        </p>
                        <div className="flex items-start gap-1.5 p-2 rounded bg-brand-600/10 border border-brand-600/20">
                          <span className="text-xs flex-shrink-0">💡</span>
                          <p className="text-[11px] text-brand-300/80">
                            {cat.suggestion}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-md bg-green-950/20 border border-green-800/20 text-center">
          <p className="text-lg font-bold text-green-400">{successCount}</p>
          <p className="text-[10px] text-green-400/60">Success</p>
        </div>
        <div className="p-2 rounded-md bg-red-950/20 border border-red-800/20 text-center">
          <p className="text-lg font-bold text-red-400">{failCount}</p>
          <p className="text-[10px] text-red-400/60">Failed</p>
        </div>
        <div className="p-2 rounded-md bg-surface/50 border border-white/5 text-center">
          <p className="text-lg font-bold text-white/50">{results.length}</p>
          <p className="text-[10px] text-white/30">Total</p>
        </div>
      </div>

      {/* AI Improvement Suggestions */}
      {!allSuccess && (
        <div className="p-2.5 rounded-md bg-brand-600/10 border border-brand-600/20">
          <h4 className="text-xs font-medium text-brand-300/80 mb-1.5">
            🤖 AI Improvement Suggestions
          </h4>
          <ul className="space-y-1">
            {categorized.some((c) => c.category === 'content') && (
              <li className="text-[11px] text-white/60 flex items-start gap-1.5">
                <span>•</span>
                <span>
                  Content may contain sensitive keywords. Run through{' '}
                  <strong className="text-brand-300/80">Content Compliance Check</strong> before retry.
                </span>
              </li>
            )}
            {categorized.some((c) => c.category === 'auth') && (
              <li className="text-[11px] text-white/60 flex items-start gap-1.5">
                <span>•</span>
                <span>
                  Platform sessions expired. Use{' '}
                  <strong className="text-brand-300/80">Account Sync</strong> to refresh login states.
                </span>
              </li>
            )}
            {categorized.some((c) => c.category === 'platform') && (
              <li className="text-[11px] text-white/60 flex items-start gap-1.5">
                <span>•</span>
                <span>
                  Consider scheduling during off-peak hours or reducing concurrent
                  publishes to avoid rate limits.
                </span>
              </li>
            )}
            {categorized.some((c) => c.category === 'media') && (
              <li className="text-[11px] text-white/60 flex items-start gap-1.5">
                <span>•</span>
                <span>
                  Check image/video formats. Some platforms require specific
                  dimensions or codecs. Use the Media Optimizer before retry.
                </span>
              </li>
            )}
            <li className="text-[11px] text-white/60 flex items-start gap-1.5">
              <span>•</span>
              <span>
                View detailed logs in{' '}
                <strong className="text-brand-300/80">AiBrand Studio → Publish History</strong>
              </span>
            </li>
          </ul>
        </div>
      )}
    </MessageBox>
  );
}
