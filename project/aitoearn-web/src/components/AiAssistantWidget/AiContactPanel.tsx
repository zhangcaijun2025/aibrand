/**
 * AiContactPanel — 微信扫码 + 联系方式面板
 * 参照 growthman.cn 设计：微信扫码咨询
 */

'use client'

import { Copy, MessageSquare, Phone, QrCode, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import s from './AiAssistantWidget.module.scss'

interface AiContactPanelProps {
  onClose: () => void
}

export function AiContactPanel({ onClose }: AiContactPanelProps) {
  const handleCopyPhone = () => {
    navigator.clipboard.writeText('0755-82326831')
    toast.success('电话已复制')
  }

  return (
    <>
      {/* 面板头部 */}
      <div className={s.panelHeader}>
        <div className={s.panelHeaderLeft}>
          <div className={s.panelAvatar} style={{ background: 'linear-gradient(135deg, #07C160, #06AD56)' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <div className={s.panelTitle}>微信扫码咨询</div>
            <div className={s.panelStatus}>真人客服 · 工作日 9:00-18:00</div>
          </div>
        </div>
        <button className={s.closeBtn} onClick={onClose} type="button">
          <X size={16} />
        </button>
      </div>

      {/* 内容 */}
      <div className={s.panelBody}>
        <div className="text-center space-y-5">
          {/* 二维码区域 */}
          <div className="mx-auto w-48 h-48 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3">
            <QrCode size={72} className="text-gray-300" />
            <span className="text-[10px] text-gray-400">请使用微信扫码</span>
          </div>

          {/* 说明 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>📱 扫描二维码添加企业微信</p>
            <p>💬 专属客服一对一解答</p>
            <p>🕐 工作日 9:00-18:00（节假日顺延）</p>
          </div>

          {/* 分隔线 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] text-gray-400">或</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* 电话联系 */}
          <div>
            <button
              onClick={handleCopyPhone}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-green-300 hover:bg-green-50 transition-all cursor-pointer"
            >
              <Phone size={16} className="text-green-500" />
              0755-8232 6831
              <Copy size={14} className="text-gray-400" />
            </button>
            <p className="text-[10px] text-gray-400 mt-1">点击复制电话号码</p>
          </div>

          {/* 转人工 */}
          <div className="pt-2">
            <button
              onClick={() => {
                toast.success('已发起转人工请求，客服将尽快联系你')
              }}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #07C160, #06AD56)' }}
            >
              <MessageSquare size={16} className="inline mr-1" />
              转人工客服
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
