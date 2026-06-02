/**
 * 扩展发布页面
 * 通过 MultiPost 扩展发布到 20+ 内容平台
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BRIDGE_PLATFORMS,
  detectMultiPostExtension,
  publishViaExtension,
  getBridgePlatformsByType,
} from '@/api/plat/bridge/extensionBridge';
import { BridgePlatform } from '@/api/plat/bridge/types';

export default function BridgePublishPage() {
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'article' | 'dynamic' | 'video'>('dynamic');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showInstallGuide, setShowInstallGuide] = useState(false);

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
    const result = await publishViaExtension(platform, {
      title,
      content,
      htmlContent: `<h1>${title}</h1><p>${content}</p>`,
    });
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🌐 扩展发布</h1>
        <p style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
          通过 MultiPost 浏览器扩展，一键发布到 20+ 内容平台
        </p>
      </div>

      {/* 扩展检测横幅 */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 12,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background:
            extensionInstalled === null
              ? 'rgba(255,180,50,0.08)'
              : extensionInstalled
              ? 'rgba(0,204,0,0.06)'
              : 'rgba(255,77,77,0.06)',
          border: `1px solid ${
            extensionInstalled === null
              ? 'rgba(255,180,50,0.15)'
              : extensionInstalled
              ? 'rgba(0,204,0,0.15)'
              : 'rgba(255,77,77,0.15)'
          }`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>
            {extensionInstalled === null ? '⏳' : extensionInstalled ? '✅' : 'ℹ️'}
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {extensionInstalled === null
                ? '检测中...'
                : extensionInstalled
                ? 'MultiPost 扩展已就绪'
                : '需要安装 MultiPost 扩展'}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              {extensionInstalled
                ? '已检测到扩展，可以开始发布内容到各个平台'
                : '安装后可一键发布到小红书、知乎、微博等 20+ 平台'}
            </div>
          </div>
        </div>
        {!extensionInstalled && (
          <button
            onClick={() => setShowInstallGuide(!showInstallGuide)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid #DDD',
              background: 'white',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            安装指南
          </button>
        )}
      </div>

      {/* 安装指南 */}
      {showInstallGuide && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            background: '#F8F9FF',
            border: '1px solid #E8E8FF',
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>📥 安装 MultiPost 扩展</div>
          <div>1. 打开 Chrome 网上应用店</div>
          <div>2. 搜索 "MultiPost"</div>
          <div>3. 点击「添加至 Chrome」</div>
          <div>4. 安装完成后刷新本页面</div>
          <div style={{ marginTop: 8, color: '#667eea' }}>
            或直接访问：https://multipost.app
          </div>
        </div>
      )}

      {/* 内容输入 */}
      <div
        style={{
          background: 'white',
          borderRadius: 14,
          border: '1px solid #F0F0F0',
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📄 发布内容</div>
        <input
          placeholder="标题（可选）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 0',
            border: 'none',
            borderBottom: '2px solid #F0F0F0',
            fontSize: 16,
            fontWeight: 600,
            outline: 'none',
            fontFamily: 'inherit',
            marginBottom: 12,
          }}
        />
        <textarea
          placeholder="输入要发布的内容..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          style={{
            width: '100%',
            border: 'none',
            fontSize: 14,
            lineHeight: 1.8,
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            minHeight: 120,
          }}
        />
      </div>

      {/* 平台分类标签页 */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 16,
          background: '#F5F5F5',
          borderRadius: 10,
          padding: 3,
        }}
      >
        {typeTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#333' : '#999',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* 平台网格 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {currentPlatforms.map((platform) => {
          const selected = selectedPlatforms.has(platform.id);
          const result = publishResults[platform.id];
          return (
            <div
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              style={{
                padding: '12px',
                borderRadius: 10,
                cursor: 'pointer',
                border: `1.5px solid ${
                  result
                    ? result.success
                      ? '#00CC00'
                      : '#FF4D4D'
                    : selected
                    ? platform.color
                    : '#EEE'
                }`,
                background: selected ? `${platform.color}08` : 'white',
                transition: 'all 0.2s',
                userSelect: 'none',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>
                {getPlatformEmoji(platform.icon)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{platform.name}</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                {platform.type === 'article' ? '文章' : platform.type === 'dynamic' ? '动态' : '视频'}
              </div>
              {result && (
                <div
                  style={{
                    fontSize: 10,
                    marginTop: 4,
                    color: result.success ? '#00CC00' : '#FF4D4D',
                  }}
                >
                  {result.success ? '✅ 已发布' : '❌ 失败'}
                </div>
              )}
              {publishing === platform.id && (
                <div style={{ fontSize: 10, marginTop: 4, color: '#667eea' }}>⏳ 发布中...</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 发布按钮 */}
      <button
        onClick={publishAllSelected}
        disabled={selectedPlatforms.size === 0 || !content.trim() || publishing !== null}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          border: 'none',
          fontSize: 15,
          fontWeight: 700,
          cursor: publishing !== null ? 'wait' : selectedPlatforms.size === 0 ? 'not-allowed' : 'pointer',
          background:
            selectedPlatforms.size === 0 || !content.trim()
              ? '#F0F0F0'
              : 'linear-gradient(135deg, #667eea, #764ba2)',
          color: selectedPlatforms.size === 0 || !content.trim() ? '#CCC' : '#FFF',
          transition: 'all 0.3s',
          fontFamily: 'inherit',
        }}
      >
        {publishing !== null
          ? '发布中...'
          : selectedPlatforms.size === 0
          ? '请选择要发布的平台'
          : `🚀 发布到 ${selectedPlatforms.size} 个平台`}
      </button>

      {/* 发布结果摘要 */}
      {Object.keys(publishResults).length > 0 && (
        <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: '#F8F9FF', border: '1px solid #E8E8FF' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📊 发布结果</div>
          {Object.entries(publishResults).map(([id, result]) => {
            const platform = BRIDGE_PLATFORMS.find((p) => p.id === id);
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 12 }}>
                <span>{result.success ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 500 }}>{platform?.name || id}</span>
                <span style={{ color: '#999' }}>— {result.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getPlatformEmoji(icon: string): string {
  const emojiMap: Record<string, string> = {
    zhihu: '❓', weixin: '💬', csdn: '📝', juejin: '⛏️',
    jianshu: '📖', wordpress: '🔤', substack: '✉️', baijiahao: '📰',
    toutiao: '📱', xueqiu: '🐂', rednote: '📕', weibo: '📢',
    douban: '🎬', reddit: '👽', linkedin: '💼', bluesky: '☁️',
    kuaishou: '🎵', weixinchannel: '📺', facebook: 'f', threads: '◎',
  };
  return emojiMap[icon] || '🌐';
}
