/**
 * AiBrand Extension v3 — Side Panel (Design System v1)
 *
 * Full publish control center with:
 *   - Connection + auth status
 *   - Quality gate → Confirm → Execute → Feedback state machine
 *   - Toast notifications for background events
 *   - Platform health overview
 *   - Quick actions
 */

import { useEffect, useState, useCallback } from 'react';
import { Button, Card, CardSection, Badge, ProgressBar, ToastProvider, useToast } from '@/ui/components';
import { QualityGateCheck } from '@/ui/components/QualityGate';
import { PreSendConfirm } from '@/ui/components/PreSendConfirm';
import { PostSendFeedback } from '@/ui/components/PostSendFeedback';
import { getQualityGate } from '@/core/quality-gate';
import type { NewTaskPayload, AuthState, PlatformResult, QualityVerdictPayload } from '@/shared/types';

// ─── State Machine ───────────────────────────────────────────────────────

type AppPhase =
  | { stage: 'idle' }
  | { stage: 'quality'; task: NewTaskPayload }
  | { stage: 'confirm'; task: NewTaskPayload; verdict: QualityVerdictPayload }
  | { stage: 'executing'; task: NewTaskPayload; verdict: QualityVerdictPayload }
  | { stage: 'feedback'; task: NewTaskPayload; results: PlatformResult[]; verdict?: QualityVerdictPayload };

// ─── App ──────────────────────────────────────────────────────────────────

function SidePanelApp() {
  const toast = useToast();
  const [wsConnected, setWsConnected] = useState(false);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [phase, setPhase] = useState<AppPhase>({ stage: 'idle' });
  const [recentActivity, setRecentActivity] = useState<{ time: string; text: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addActivity = (text: string, type: 'success' | 'error' | 'info') => {
    setRecentActivity(prev => [{ time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), text, type }, ...prev.slice(0, 4)]);
  };

  // ─── Connection ──────────────────────────────────────────────────────

  useEffect(() => {
    const poll = () => {
      chrome.runtime.sendMessage({ action: 'AIBRAND_GET_STATE' }, (res) => {
        if (res?.success) {
          setWsConnected(res.data.wsConnected);
          setAuth(res.data.auth);
        }
      });
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  // ─── Task Listener ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (request: { action: string; data: any }) => {
      if (request.action === 'AIBRAND_NEW_TASK') {
        const task = request.data as NewTaskPayload;
        toast.info('新任务到达', `${task.platforms.length} 个平台 · ${task.content.type}`);
        addActivity(`收到发布任务: ${task.content.title?.slice(0, 30) ?? '(无标题)'}`, 'info');
        setPhase({ stage: 'quality', task });
        wireQualityEvents(task);
      }

      if (request.action === 'AIBRAND_TASK_COMPLETE') {
        const results = request.data as PlatformResult[];
        const ok = results.filter(r => r.success).length;
        setPhase(prev => prev.stage === 'executing'
          ? { stage: 'feedback', task: prev.task, results, verdict: prev.verdict }
          : prev,
        );
        toast[ok === results.length ? 'success' : 'warning'](
          `发布完成: ${ok}/${results.length} 成功`,
          ok < results.length ? `${results.length - ok} 个平台失败，查看详情` : undefined,
        );
        addActivity(`发布完成: ${ok}/${results.length}`, ok === results.length ? 'success' : 'error');
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [toast]);

  // ─── Wire WS quality events ─────────────────────────────────────────

  const wireQualityEvents = useCallback((task: NewTaskPayload) => {
    const gate = getQualityGate();
    gate.setTransport((type, payload) => {
      let sent = false;
      chrome.runtime.sendMessage({ action: 'AIBRAND_WS_SEND', data: { type, payload } }, (r) => { sent = r?.success ?? false; });
      return sent;
    });

    const qualityListener = (req: { action: string; data: any }) => {
      if (!req.action?.startsWith('AIBRAND_QUALITY_')) return;
      window.dispatchEvent(new CustomEvent('aibrand-quality-event', {
        detail: { eventType: req.action.replace('AIBRAND_QUALITY_', 'quality:').toLowerCase(), payload: req.data },
      }));
    };
    chrome.runtime.onMessage.addListener(qualityListener);
    return () => chrome.runtime.onMessage.removeListener(qualityListener);
  }, []);

  // ─── Transitions ─────────────────────────────────────────────────────

  const handleQualityPass = (verdict: QualityVerdictPayload) => {
    toast.success('质检通过', `总分 ${verdict.overallScore} · 自动进入发送确认`);
    addActivity(`质检通过: ${verdict.overallScore}分`, 'success');
    setPhase(prev => prev.stage === 'quality' ? { stage: 'confirm', task: prev.task, verdict } : prev);
  };

  const handleQualityFail = (verdict: QualityVerdictPayload) => {
    toast.warning('质检未通过', `得分 ${verdict.overallScore} · 需要 ${verdict.threshold} 分`);
    addActivity(`质检未通过: ${verdict.overallScore}分`, 'error');
  };

  const handleEditRetry = () => {
    setPhase(prev => {
      if (prev.stage === 'quality') { getQualityGate().requestCheck(prev.task, true); return prev; }
      return prev;
    });
  };

  const handleConfirm = () => {
    setPhase(prev => {
      if (prev.stage === 'confirm') {
        chrome.runtime.sendMessage({ action: 'AIBRAND_EXECUTE_TASK', data: prev.task });
        toast.info('开始发布', `${prev.task.platforms.length} 个平台并行执行中...`);
        addActivity(`开始多平台发布: ${prev.task.platforms.join(', ')}`, 'info');
        return { stage: 'executing', task: prev.task, verdict: prev.verdict };
      }
      return prev;
    });
  };

  const handleCancel = () => setPhase({ stage: 'idle' });

  const handleDismiss = () => setPhase({ stage: 'idle' });

  const handleRetry = (platforms: string[]) => {
    setPhase(prev => prev.stage === 'feedback'
      ? { stage: 'quality', task: { ...prev.task, taskId: `retry_${Date.now()}`, platforms } }
      : prev,
    );
  };

  const handleRetryAll = () => {
    setPhase(prev => prev.stage === 'feedback'
      ? { stage: 'quality', task: { ...prev.task, taskId: `retry_${Date.now()}` } }
      : prev,
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────

  const isIdle = phase.stage === 'idle';

  return (
    <div className="flex flex-col min-h-screen p-4 space-y-3 bg-zinc-950 text-zinc-100">
      {/* ── Header ── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">AiBrand</span>
          <Badge variant="brand">v3</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${wsConnected ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-red-500'}`} />
          <span className="text-[11px] text-zinc-500">{wsConnected ? 'Live' : 'Offline'}</span>
        </div>
      </header>

      {/* ── Auth ── */}
      <Card className="!p-3">
        {auth?.isAuthenticated ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">
              {auth.user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-sm font-medium">{auth.user?.name ?? 'User'}</p>
              <p className="text-[11px] text-zinc-500">{auth.user?.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-400">
            ⚠️ 未登录 —
            <a href="http://localhost:8080/auth" target="_blank" className="ml-1 underline hover:text-amber-300" rel="noreferrer">登录</a>
          </p>
        )}
      </Card>

      {/* ── Main Stage ── */}
      <section className="flex-1 space-y-3">
        {/* Idle */}
        {isIdle && <IdleDashboard recentActivity={recentActivity} />}

        {/* Quality Gate */}
        {phase.stage === 'quality' && (
          <QualityGateCheck task={phase.task} visible onPass={handleQualityPass} onFail={handleQualityFail} onEditRetry={handleEditRetry} />
        )}

        {/* Confirm */}
        {phase.stage === 'confirm' && (
          <PreSendConfirm task={phase.task} visible qualityVerdict={phase.verdict}
            onConfirm={handleConfirm}
            onSchedule={() => {}} // Phase 4
            onEdit={() => chrome.tabs.create({ url: `http://localhost:6060/dashboard/publish?taskId=${phase.task.taskId}&edit=true` })}
            onCancel={handleCancel}
          />
        )}

        {/* Executing */}
        {phase.stage === 'executing' && <ExecutingView task={phase.task} />}

        {/* Feedback */}
        {phase.stage === 'feedback' && (
          <PostSendFeedback taskId={phase.task.taskId} contentTitle={phase.task.content.title ?? '(无标题)'}
            results={phase.results} visible
            onRetry={handleRetry} onRetryAll={handleRetryAll}
            onEditRetry={() => chrome.tabs.create({ url: `http://localhost:6060/dashboard/publish?retry=true&taskId=${phase.task.taskId}` })}
            onDismiss={handleDismiss}
          />
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="pt-3 border-t border-zinc-800 flex items-center justify-between">
        <p className="text-[10px] text-zinc-600">AiBrand Extension v3.0</p>
        <div className="flex gap-3">
          <button onClick={() => chrome.runtime.openOptionsPage?.()} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">⚙️ 设置</button>
          <a href="https://aibrand.ai" target="_blank" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors" rel="noreferrer">aibrand.ai</a>
        </div>
      </footer>
    </div>
  );
}

// ─── Idle Dashboard ───────────────────────────────────────────────────────

function IdleDashboard({ recentActivity }: { recentActivity: { time: string; text: string; type: string }[] }) {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Welcome */}
      <div className="p-6 text-center rounded-lg bg-zinc-900 border border-zinc-800">
        <p className="text-3xl mb-2">🚀</p>
        <p className="text-sm text-zinc-400">等待发布任务</p>
        <p className="mt-1 text-xs text-zinc-600">AI 内容工厂的任务将自动触发质检与发布</p>
        <Button variant="secondary" size="sm" className="mt-4"
          onClick={() => chrome.tabs.create({ url: 'http://localhost:6060/dashboard' })}>
          打开 AiBrand Studio
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '连接状态', value: 'Live', color: 'text-green-400' },
          { label: '质检 Agent', value: '就绪', color: 'text-blue-400' },
          { label: '发布通道', value: 'WebSocket', color: 'text-zinc-400' },
        ].map(s => (
          <div key={s.label} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
            <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <CardSection title="最近活动">
          <div className="space-y-1">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-500 py-1">
                <span className="text-zinc-700 font-mono text-[10px] w-12 flex-shrink-0">{a.time}</span>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.type === 'success' ? 'bg-green-500' : a.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <span className="truncate">{a.text}</span>
              </div>
            ))}
          </div>
        </CardSection>
      )}
    </div>
  );
}

// ─── Executing View ───────────────────────────────────────────────────────

function ExecutingView({ task }: { task: NewTaskPayload }) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="p-4 rounded-lg bg-zinc-900 border border-blue-800/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          <div>
            <h3 className="text-sm font-semibold text-blue-400">发布中...</h3>
            <p className="text-xs text-zinc-500 truncate">{task.content.title}</p>
          </div>
        </div>
        <ProgressBar indeterminate variant="brand" label="多平台并行执行" />
      </div>

      <CardSection title="目标平台">
        <div className="flex gap-1.5 flex-wrap">
          {task.platforms.map(p => (
            <Badge key={p} variant="default" dot>{p}</Badge>
          ))}
        </div>
      </CardSection>
    </div>
  );
}

// ─── Root (with ToastProvider) ────────────────────────────────────────────

export default function App() {
  return (
    <ToastProvider>
      <SidePanelApp />
    </ToastProvider>
  );
}
