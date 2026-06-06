'use client';

/**
 * DashboardPublishCore — 仪表板扩展发布页
 * 支持文本 + 图片 + 视频文件，通过浏览器扩展一站式发布到多平台
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BRIDGE_PLATFORMS,
  detectMultiPostExtension,
  publishViaExtension,
  getBridgePlatformsByType,
} from '@/api/plat/bridge/extensionBridge';
import type { BridgePlatform } from '@/api/plat/bridge/types';

export function DashboardPublishCore() {
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'article' | 'dynamic' | 'video' | 'podcast'>('dynamic');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    detectMultiPostExtension()
      .then(setExtensionInstalled)
      .catch((err) => {
        setExtensionInstalled(false);
        setExtensionError(err instanceof Error ? err.message : '检测失败');
      });
  }, []);

  const platformsByType = useMemo(() => getBridgePlatformsByType(), []);

  const typeTabs = [
    { id: 'article' as const, label: '📝 文章', count: platformsByType.article?.length || 0 },
    { id: 'dynamic' as const, label: '💬 动态', count: platformsByType.dynamic?.length || 0 },
    { id: 'video' as const, label: '🎬 视频', count: platformsByType.video?.length || 0 },
    { id: 'podcast' as const, label: '🎙️ 播客', count: platformsByType.podcast?.length || 0 },
  ];

  const currentPlatforms = platformsByType[activeTab] || [];

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setVideos((prev) => [...prev, ...files]);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));
  const removeVideo = (idx: number) => setVideos((prev) => prev.filter((_, i) => i !== idx));

  const publishToPlatform = async (platform: BridgePlatform) => {
    setPublishing(platform.id);
    try {
      const result = await publishViaExtension(platform, { title, content, images, videos });
      setPublishResults((prev) => ({ ...prev, [platform.id]: result }));
    } catch (err) {
      setPublishResults((prev) => ({
        ...prev,
        [platform.id]: { success: false, message: err instanceof Error ? err.message : '发布失败' },
      }));
    }
    setPublishing(null);
  };

  const publishAllSelected = async () => {
    const selected = BRIDGE_PLATFORMS.filter((p) => selectedPlatforms.has(p.id));
    for (const platform of selected) {
      await publishToPlatform(platform);
    }
  };

  const canPublish = selectedPlatforms.size > 0 && (content.trim() || images.length > 0 || videos.length > 0);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🌐 扩展发布</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
        通过浏览器扩展一键发布到 {BRIDGE_PLATFORMS.length}+ 内容平台
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
              ? `可以开始发布内容到 ${BRIDGE_PLATFORMS.length}+ 平台`
              : extensionError || '请确保已加载 AiBrand 扩展到 Chrome'}
          </div>
          {!extensionInstalled && extensionInstalled !== null && (
            <div style={{ fontSize: 11, color: '#667eea', marginTop: 6 }}>
              💡 扩展未安装？请从 Chrome 应用商店或本地加载
            </div>
          )}
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
              rows={4}
              style={{ width: '100%', border: 'none', fontSize: 14, lineHeight: 1.8, outline: 'none', resize: 'vertical', minHeight: 80, marginBottom: 16 }}
            />

            {/* Media file upload */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* Images */}
              <button
                onClick={() => imageInputRef.current?.click()}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1.5px dashed #CCC',
                  background: '#FAFAFA', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                🖼️ 添加图片
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />

              {/* Videos */}
              <button
                onClick={() => videoInputRef.current?.click()}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1.5px dashed #CCC',
                  background: '#FAFAFA', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                🎬 添加视频
              </button>
              <input ref={videoInputRef} type="file" accept="video/*" multiple hidden onChange={handleVideoSelect} />
            </div>

            {/* File previews */}
            {(images.length > 0 || videos.length > 0) && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {images.map((f, i) => (
                  <span
                    key={`img-${i}`}
                    style={{
                      padding: '3px 8px', borderRadius: 6, background: '#F0F4FF',
                      fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    🖼️ {f.name.length > 18 ? f.name.slice(0, 15) + '...' : f.name}
                    <button
                      onClick={() => removeImage(i)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, padding: '0 2px', color: '#F44' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {videos.map((f, i) => (
                  <span
                    key={`vid-${i}`}
                    style={{
                      padding: '3px 8px', borderRadius: 6, background: '#FFF4F0',
                      fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    🎬 {f.name.length > 18 ? f.name.slice(0, 15) + '...' : f.name}
                    <button
                      onClick={() => removeVideo(i)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, padding: '0 2px', color: '#F44' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Platform tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F5F5F5', borderRadius: 10, padding: 3 }}>
            {typeTabs.filter((t) => t.count > 0).map((tab) => (
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
            disabled={!canPublish || publishing !== null}
            style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              fontSize: 15, fontWeight: 700, cursor: canPublish ? 'pointer' : 'not-allowed',
              background: canPublish ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#EEE',
              color: canPublish ? '#FFF' : '#BBB',
            }}
          >
            🚀 发布到 {selectedPlatforms.size || 0} 个平台
            {publishing && ` (${publishing}...)`}
          </button>
        </>
      )}
    </div>
  );
}

const PLATFORM_EMOJI: Record<string, string> = {
  zhihu: '❓', csdn: '📝', juejin: '⛏️', jianshu: '📖', wordpress: '🔤',
  medium: '📰', devto: '💻', segmentfault: '🟢', substack: '📬',
  toutiao: '📰', baijiahao: '🔵', wangyihao: '🔴', sohuhao: '🟡',
  weixin_article: '💬',
  rednote: '📕', weibo: '📢', douyin: '🎵', bilibili: '📺', x: '🐦',
  youtube: '▶️', instagram: '📷', linkedin: '💼', facebook: '👤', tiktok: '🎶',
  threads: '◎', bluesky: '☁️', reddit: '👽', pinterest: '📌', quora: '🟥',
  kuaishou: '⚡', weishi: '🎬', xigua: '🍉',
  iqiyi: '🟢', youku: '🔵',
  youtube_shorts: '⏩', instagram_reels: '🎞️',
  xiaoyuzhou: '🟣', ximalaya: '🟠', lizhi: '🔴', qingting: '🔵',
  spotify: '🟢', apple_podcast: '🟣',
};
