/**
 * AiBrand Extension v3 — Options / Settings Page
 */

import { useState, useEffect } from 'react';
import { Button, Card, CardSection, Badge, useToast, ToastProvider } from '@/ui/components';

interface Settings {
  autoPublish: boolean;
  qualityGate: boolean;
  notifyOnComplete: boolean;
  notifyOnError: boolean;
  closeTabsAfterPublish: boolean;
  maxRetries: number;
}

const defaults: Settings = {
  autoPublish: false,
  qualityGate: true,
  notifyOnComplete: true,
  notifyOnError: true,
  closeTabsAfterPublish: false,
  maxRetries: 3,
};

function OptionsApp() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get('aibrand_settings', (result) => {
      if (result.aibrand_settings) {
        setSettings({ ...defaults, ...result.aibrand_settings });
      }
    });
  }, []);

  const save = () => {
    chrome.storage.local.set({ aibrand_settings: settings }, () => {
      toast.success('设置已保存');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const toggle = (key: keyof Settings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const Toggle = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) => (
    <label className="flex items-start gap-3 py-2.5 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={onChange}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 mt-0.5 ${
          value ? 'bg-blue-600' : 'bg-zinc-700'
        }`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
          value ? 'left-[18px]' : 'left-0.5'
        }`} />
      </button>
    </label>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-lg mx-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">AiBrand 设置</h1>
            <p className="text-sm text-zinc-500 mt-1">Extension v3.0</p>
          </div>
          <Badge variant="brand">v3</Badge>
        </div>

        {/* Publish Settings */}
        <Card>
          <CardSection title="发布设置">
            <Toggle label="质检把关" desc="发布前必须通过质量总监 Agent 审核（推荐开启）"
              value={settings.qualityGate} onChange={() => toggle('qualityGate')} />
            <Toggle label="自动发布" desc="质检通过后无需确认，直接发送（谨慎开启）"
              value={settings.autoPublish} onChange={() => toggle('autoPublish')} />
            <Toggle label="发布后关闭标签页" desc="发布完成后自动关闭平台发布页面"
              value={settings.closeTabsAfterPublish} onChange={() => toggle('closeTabsAfterPublish')} />
          </CardSection>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardSection title="通知设置">
            <Toggle label="发布完成通知" desc="所有平台发布完成后弹出通知"
              value={settings.notifyOnComplete} onChange={() => toggle('notifyOnComplete')} />
            <Toggle label="发布失败通知" desc="任一平台失败时立即弹出通知"
              value={settings.notifyOnError} onChange={() => toggle('notifyOnError')} />
          </CardSection>
        </Card>

        {/* Retry Settings */}
        <Card>
          <CardSection title="重试设置">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">最大重试次数</p>
                <p className="text-xs text-zinc-500 mt-0.5">每个平台失败后的最大重试次数</p>
              </div>
              <select
                value={settings.maxRetries}
                onChange={(e) => setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-sm text-zinc-200"
              >
                {[1, 2, 3, 5, 7].map(n => <option key={n} value={n}>{n} 次</option>)}
              </select>
            </div>
          </CardSection>
        </Card>

        {/* About */}
        <Card>
          <CardSection title="关于">
            <div className="text-xs text-zinc-500 space-y-1">
              <p>AiBrand Extension v3.0</p>
              <p>AI-Native Multi-Platform Publishing Terminal</p>
              <a href="https://aibrand.ai" target="_blank" className="text-blue-400 hover:underline block mt-1" rel="noreferrer">aibrand.ai</a>
            </div>
          </CardSection>
        </Card>

        {/* Save */}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setSettings(defaults)}>恢复默认</Button>
          <Button onClick={save}>{saved ? '✅ 已保存' : '保存设置'}</Button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <OptionsApp />
    </ToastProvider>
  );
}
