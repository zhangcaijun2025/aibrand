/**
 * 桥接发布面板
 * 
 * 在 AiBrand 发布对话框中集成 MultiPost 扩展桥接功能
 * 用于发布到 AiBrand 尚未直接对接的平台
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  BRIDGE_PLATFORMS,
  detectMultiPostExtension,
  publishViaExtension,
  getBridgePlatformsByType,
} from '@/api/plat/bridge/extensionBridge';
import { BridgePlatform } from '@/api/plat/bridge/types';

interface BridgePublishPanelProps {
  /** 发布内容 */
  content: {
    title?: string;
    content: string;
    htmlContent?: string;
    images?: File[];
    videos?: File[];
  };
  /** 发布完成回调 */
  onPublishComplete?: (result: { platform: string; success: boolean; message: string }) => void;
}

export default function BridgePublishPanel({ content, onPublishComplete }: BridgePublishPanelProps) {
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  const platformsByType = getBridgePlatformsByType();
  const typeLabels: Record<string, string> = {
    article: '📝 文章平台',
    dynamic: '💬 社交平台',
    video: '🎬 视频平台',
  };

  useEffect(() => {
    detectMultiPostExtension().then(setExtensionInstalled);
  }, []);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const publishToPlatform = async (platform: BridgePlatform) => {
    setPublishing(platform.id);
    const result = await publishViaExtension(platform, content);
    setResults((prev) => ({ ...prev, [platform.id]: result }));
    setPublishing(null);
    onPublishComplete?.({
      platform: platform.name,
      success: result.success,
      message: result.message,
    });
  };

  const publishAll = async () => {
    const selected = BRIDGE_PLATFORMS.filter((p) => selectedPlatforms.has(p.id));
    for (const platform of selected) {
      await publishToPlatform(platform);
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      {/* 扩展检测 */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background:
            extensionInstalled === null
              ? 'rgba(255,180,50,0.1)'
              : extensionInstalled
              ? 'rgba(0,204,0,0.08)'
              : 'rgba(255,77,77,0.08)',
          border: `1px solid ${
            extensionInstalled === null
              ? 'rgba(255,180,50,0.2)'
              : extensionInstalled
              ? 'rgba(0,204,0,0.2)'
              : 'rgba(255,77,77,0.2)'
          }`,
        }}
      >
        <span>
          {extensionInstalled === null
            ? '⏳'
            : extensionInstalled
            ? '✅'
            : 'ℹ️'}
        </span>
        <span>
          {extensionInstalled === null
            ? '正在检测 MultiPost 扩展...'
            : extensionInstalled
            ? 'MultiPost 扩展已安装，可通过扩展发布到更多平台'
            : '未检测到 MultiPost 扩展。安装后可一键发布到 20+ 平台'}
        </span>
      </div>

      {/* 平台选择 */}
      {Object.entries(platformsByType).map(([type, platforms]) => (
        <div key={type} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#999',
              marginBottom: 8,
              letterSpacing: 0.5,
            }}
          >
            {typeLabels[type] || type}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {platforms.map((platform) => {
              const selected = selectedPlatforms.has(platform.id);
              const result = results[platform.id];
              return (
                <div
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    border: `1.5px solid ${
                      result
                        ? result.success
                          ? '#00CC00'
                          : '#FF4D4D'
                        : selected
                        ? platform.color
                        : '#E0E0E0'
                    }`,
                    background: selected ? `${platform.color}10` : '#F8F8F8',
                    color: selected ? platform.color : '#666',
                    transition: 'all 0.2s',
                    userSelect: 'none',
                  }}
                >
                  <span>{getPlatformEmoji(platform.icon)}</span>
                  <span>{platform.name}</span>
                  {result && (
                    <span style={{ fontSize: 10 }}>{result.success ? '✅' : '❌'}</span>
                  )}
                  {publishing === platform.id && (
                    <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={publishAll}
          disabled={selectedPlatforms.size === 0 || publishing !== null}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: publishing !== null ? 'wait' : 'pointer',
            background:
              selectedPlatforms.size === 0
                ? '#F0F0F0'
                : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: selectedPlatforms.size === 0 ? '#CCC' : '#FFF',
            transition: 'all 0.3s',
            fontFamily: 'inherit',
          }}
        >
          {publishing !== null
            ? `正在发布到 ${BRIDGE_PLATFORMS.find((p) => p.id === publishing)?.name}...`
            : `发布到所选 ${selectedPlatforms.size} 个平台`}
        </button>
      </div>
    </div>
  );
}

function getPlatformEmoji(icon: string): string {
  const emojiMap: Record<string, string> = {
    zhihu: '❓',
    weixin: '💬',
    csdn: '📝',
    juejin: '⛏️',
    jianshu: '📖',
    wordpress: '🔤',
    substack: '✉️',
    baijiahao: '📰',
    toutiao: '📱',
    xueqiu: '🐂',
    rednote: '📕',
    weibo: '📢',
    douban: '🎬',
    reddit: '👽',
    linkedin: '💼',
    bluesky: '☁️',
    kuaishou: '🎵',
    weixinchannel: '📺',
  };
  return emojiMap[icon] || '🌐';
}
