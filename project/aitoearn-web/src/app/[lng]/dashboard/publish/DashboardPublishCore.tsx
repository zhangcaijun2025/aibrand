'use client';

/**
 * DashboardPublishCore — 仪表板扩展发布页
 * 复用 BridgePublish 组件，包裹在仪表板布局中
 */

import React, { useState, useEffect } from 'react';
import {
  BRIDGE_PLATFORMS,
  detectMultiPostExtension,
  publishViaExtension,
  getBridgePlatformsByType,
} from '@/api/plat/bridge/extensionBridge';
import type { BridgePlatform } from '@/api/plat/bridge/types';

export function DashboardPublishCore() {
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'article' | 'dynamic' | 'video'>('dynamic');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    detectMultiPostExtension().then(setExtensionInstalled);
  }, []);

  const platformsByType = getBridgePlatformsByType();

  const typeTabs = [
    { id: 'article' as const, label: '📝 文章', count: platformsByType.article?.length || 0 },
    { id: 'dynamic' as const, label: '💬 动态', count: platformsByType.dynamic?.length || 0 },
    { id: 'video' as const, label: '🎬 视频', count: platformsByType.video?.length || 0 },
  ];

  const currentPlatforms = platformsByType[activeTab] || [];

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const publishToPlatform = async (platform: BridgePlatform) => {
    setPublishing(platform.id);
    const result = await publishViaExtension(platform, { title, content });
    setPublishResults((prev) => ({ ...prev, [platform.id]: result }));
    setPublishing(null);
  };

  const publishAllSelected = async () => {
    const selected = BRIDGE_PLATFORMS.filter((p) => selectedPlatforms.has(p.id));
    for (const platform of selected) {
      await publishToPlatform(platform);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🌐 扩展发布</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
        通过浏览器扩展一键发布到 30+ 内容平台
      </p>

      {/* Extension detection banner */}
      <div
        style={{
          padding: '16px', borderRadius: 14, marginBottom: 24,
          background: extensionInstalled ? 'rgba(0,200,0,0.06)' : extensionInstalled === null ? 'rgba(255,180,50,0.06)' : 'rgba(255,77,77,0.06)',
          border: `1.5px solid ${extensionInstalled ? 'rgba(0,200,0,0.2)' : extensionInstalled === null ? 'rgba(255,180,50,0.2)' : 'rgba(255,77,77,0.2)'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <span style={{ fontSize: 28 }}>
          {extensionInstalled === null ? '⏳' : extensionInstalled ? '✅' : '❌'}
        </span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {extensionInstalled === null
              ? '正在检测浏览器扩展...'
              : extensionInstalled
              ? 'AiBrand 扩展已连接'
              : '未检测到浏览器扩展'}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {extensionInstalled
              ? '可以开始发布内容到 30+ 平台'
              : '请确保已加载 AiBrand 扩展到 Chrome'}
          </div>
        </div>
      </div>

      {extensionInstalled && (
        <>
          {/* Content input */}
          <div style={{ background: '#FFF', borderRadius: 14, border: '1px solid #EEE', padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📄 发布内容</div>
            <input
              placeholder="标题（可选）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%', padding: '12px 0', border: 'none',
                borderBottom: '2px solid #EEE', fontSize: 16, fontWeight: 600,
                outline: 'none', marginBottom: 12,
              }}
            />
            <textarea
              placeholder="输入要发布的内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              style={{ width: '100%', border: 'none', fontSize: 14, lineHeight: 1.8, outline: 'none', resize: 'vertical', minHeight: 100 }}
            />
          </div>

          {/* Platform tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F5F5F5', borderRadius: 10, padding: 3 }}>
            {typeTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: activeTab === tab.id ? '#FFF' : 'transparent',
                  color: activeTab === tab.id ? '#333' : '#999',
                  boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Platform grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 24 }}>
            {currentPlatforms.map((p) => {
              const sel = selectedPlatforms.has(p.id);
              const res = publishResults[p.id];
              return (
                <div
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  style={{
                    padding: 12, borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${res ? (res.success ? '#0C0' : '#F44') : sel ? p.color : '#EEE'}`,
                    background: sel ? `${p.color}08` : '#FFF',
                  }}
                >
                  <div style={{ fontSize: 22 }}>{PLATFORM_EMOJI[p.icon] || '🌐'}</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                  {res && <div style={{ fontSize: 10, color: res.success ? '#0C0' : '#F44', marginTop: 2 }}>{res.success ? '✅' : '❌'} {res.message}</div>}
                  {publishing === p.id && <div style={{ fontSize: 10, color: '#667eea', marginTop: 2 }}>⏳ 发布中...</div>}
                </div>
              );
            })}
          </div>

          {/* Publish button */}
          <button
            onClick={publishAllSelected}
            disabled={selectedPlatforms.size === 0 || !content.trim() || publishing !== null}
            style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              fontSize: 15, fontWeight: 700, cursor: selectedPlatforms.size > 0 && content.trim() ? 'pointer' : 'not-allowed',
              background: selectedPlatforms.size > 0 && content.trim() ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#EEE',
              color: selectedPlatforms.size > 0 && content.trim() ? '#FFF' : '#BBB',
            }}
          >
            🚀 发布到 {selectedPlatforms.size || 0} 个平台
          </button>
        </>
      )}
    </div>
  );
}

const PLATFORM_EMOJI: Record<string, string> = {
  zhihu: '❓', csdn: '📝', juejin: '⛏️', jianshu: '📖', wordpress: '🔤',
  rednote: '📕', weibo: '📢', douyin: '🎵', bilibili: '📺', x: '🐦',
  youtube: '▶️', instagram: '📷', linkedin: '💼', facebook: '👤', tiktok: '🎶',
  threads: '◎', bluesky: '☁️', kuaishou: '⚡', reddit: '👽',
};
