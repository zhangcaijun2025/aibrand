/**
 * AiBrand 支付服务器 v2 - 支持支付宝 / 微信 / 手动确认
 * 
 * 环境变量：
 *   MONGODB_URI      - MongoDB 连接字符串
 *   DB_NAME          - 数据库名
 *   PORT             - 监听端口（默认 3999）
 *   FRONTEND_URL     - 前端地址（默认 http://localhost:6060）
 *   
 *   支付宝（配置任一即可启用）：
 *   ALIPAY_APP_ID    - 支付宝 APP ID
 *   ALIPAY_PRIVATE_KEY - 应用私钥（PKCS8 PEM 格式）
 *   ALIPAY_PUBLIC_KEY  - 支付宝公钥
 *   
 *   微信支付（全部配置才启用）：
 *   WECHAT_APP_ID    - 微信 AppID
 *   WECHAT_MCH_ID    - 商户号
 *   WECHAT_API_KEY   - API 密钥
 */

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ====== 配置 ======
const PORT = process.env.PORT || 3999
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/?authSource=admin&directConnection=true'
const DB_NAME = process.env.DB_NAME || 'aitoearn'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:6060'

// ====== Mongoose Schema ======
const orderSchema = new mongoose.Schema({
  userId:   { type: String, required: true, index: true },
  orderNo:  { type: String, required: true, unique: true },
  amount:   { type: Number, required: true },
  credits:  { type: Number, required: true },
  status:   { type: String, enum: ['pending', 'paid', 'completed', 'failed', 'expired'], default: 'pending' },
  paymentMethod: { type: String, default: 'manual' },
  paymentUrl:    { type: String, default: null },
  qrCodeUrl:     { type: String, default: null },
  tradeNo:       { type: String, default: null },
  paidAt:        { type: Date, default: null },
  completedAt:   { type: Date, default: null },
  metadata:      { type: Object, default: {} },
}, { timestamps: true, collection: 'creditOrders' })

const Order = mongoose.model('Order', orderSchema)

// ====== 工具 ======
function generateOrderNo() {
  const now = new Date()
  const yymmdd = now.getFullYear().toString().slice(2) +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0')
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `AB${yymmdd}${rand}`
}

function calcCredits(amount) {
  return Math.round(amount / 7 * 100)
}

// ====== 积分到账函数 ======
async function creditOrder(order) {
  const CreditsBalance = mongoose.model('CreditsBalance',
    new mongoose.Schema({}, { strict: false, collection: 'creditsBalance' }))
  await CreditsBalance.updateOne(
    { _id: order.userId },
    { $inc: { balance: order.credits } },
    { upsert: true }
  )
  const CreditsRecord = mongoose.model('CreditsRecord',
    new mongoose.Schema({}, { strict: false, collection: 'creditsRecord' }))
  await CreditsRecord.create({
    userId: order.userId,
    amount: order.credits,
    balance: order.credits,
    type: 'purchase',
    description: `积分购买: ¥${order.amount} → ${order.credits} credits`,
    metadata: { orderNo: order.orderNo, orderId: order._id.toString() },
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

// ====== 支付宝支付 ======
async function createAlipayQr(orderNo, amount, subject) {
  try {
    const appId = process.env.ALIPAY_APP_ID
    const privateKey = process.env.ALIPAY_PRIVATE_KEY
    if (!appId || !privateKey) return null

    // 动态导入 alipay-sdk (ESM兼容)
    const AlipaySdk = (await import('alipay-sdk')).default
    const alipaySdk = new AlipaySdk({
      appId,
      privateKey,
      gateway: 'https://openapi.alipay.com/gateway.do',
    })

    const result = await alipaySdk.exec('alipay.trade.precreate', {
      bizContent: {
        out_trade_no: orderNo,
        total_amount: (amount).toFixed(2),
        subject: subject || `AiBrand 积分充值 ¥${amount}`,
      },
    })

    if (result.code === '10000' && result.qr_code) {
      return {
        qrCode: result.qr_code,
        tradeNo: result.out_trade_no,
      }
    }
    return null
  } catch (err) {
    console.error('[ALIPAY] Error:', err.message)
    return null
  }
}

// ====== 微信支付 ======
async function createWechatQr(orderNo, amount, description) {
  try {
    const appId = process.env.WECHAT_APP_ID
    const mchId = process.env.WECHAT_MCH_ID
    const apiKey = process.env.WECHAT_API_KEY
    if (!appId || !mchId || !apiKey) return null

    const tenpay = (await import('tenpay')).default
    const pay = new tenpay({
      appid: appId,
      mchid: mchId,
      partnerKey: apiKey,
      pfx: fs.readFileSync(path.join(__dirname, 'apiclient_cert.p12')),
      notify_url: `${FRONTEND_URL.replace('6060', '3999')}/api/user/credits/payment/callback/wechat`,
      spbill_create_ip: '127.0.0.1',
    })

    const result = await pay.nativePay({
      out_trade_no: orderNo,
      body: description || `AiBrand 积分充值 ¥${amount}`,
      total_fee: Math.round(amount * 100), // 分
      trade_type: 'NATIVE',
    })

    if (result.code_url) {
      return { qrCode: result.code_url }
    }
    return null
  } catch (err) {
    console.error('[WECHAT] Error:', err.message)
    return null
  }
}

// ====== Express App ======
const app = express()
app.use(cors())
app.use(express.json())

// JWT 中间件
async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录' })
  }
  try {
    const token = auth.slice(7)
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('invalid token')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    req.userId = payload.id || payload.sub
    if (!req.userId) throw new Error('no user id')
    next()
  } catch {
    return res.status(401).json({ code: 401, message: 'Token 无效' })
  }
}

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'aibrand-payment' }))

// ====== 创建订单（支持 alipay / wechat / manual）=====
app.post('/api/user/credits/orders', authMiddleware, async (req, res) => {
  try {
    const { amount, planId, paymentMethod } = req.body
    if (!amount || amount < 10) {
      return res.status(400).json({ code: 400, message: '最低充值 ¥10' })
    }

    const credits = calcCredits(amount)
    const orderNo = generateOrderNo()
    let method = paymentMethod || 'manual'
    let paymentUrl = null
    let qrCodeUrl = null

    // 尝试自动支付
    if (method === 'alipay' || method === 'wechat') {
      let result = null
      if (method === 'alipay') {
        result = await createAlipayQr(orderNo, amount, `AiBrand ${credits}积分`)
      } else if (method === 'wechat') {
        result = await createWechatQr(orderNo, amount, `AiBrand ${credits}积分`)
      }

      if (result?.qrCode) {
        qrCodeUrl = result.qrCode
      } else {
        // 自动支付不可用，降级为手动模式
        method = 'manual'
        console.log(`[ORDER] ${paymentMethod} not configured, fallback to manual for ${orderNo}`)
      }
    }

    const order = await Order.create({
      userId: req.userId,
      orderNo,
      amount,
      credits,
      status: 'pending',
      paymentMethod: method,
      qrCode: qrCodeUrl,
      metadata: { planId, ip: req.ip },
    })

    console.log(`[ORDER] Created: ${orderNo}, method=${method}, ¥${amount} → ${credits} credits`)

    res.json({
      code: 0,
      data: {
        orderId: order._id.toString(),
        orderNo,
        amount,
        credits,
        status: 'pending',
        paymentMethod: method,
        paymentUrl,
        qrCode: qrCodeUrl,
        createdAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[ORDER] Create error:', err)
    res.status(500).json({ code: 500, message: '创建订单失败' })
  }
})

// ====== 查订单状态 ======
app.get('/api/user/credits/orders/:orderNo', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNo: req.params.orderNo }).lean()
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在' })
    res.json({ code: 0, data: { status: order.status, orderNo: order.orderNo } })
  } catch (err) {
    res.status(500).json({ code: 500, message: '查询失败' })
  }
})

// ====== 支付宝异步回调 ======
app.post('/api/user/credits/payment/callback/alipay', async (req, res) => {
  try {
    const { out_trade_no, trade_no, trade_status } = req.body
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      const order = await Order.findOne({ orderNo: out_trade_no })
      if (order && order.status === 'pending') {
        order.status = 'paid'
        order.paidAt = new Date()
        order.tradeNo = trade_no
        order.qrCode = undefined
        await order.save()
        await creditOrder(order)
        order.status = 'completed'
        order.completedAt = new Date()
        await order.save()
        console.log(`[ALIPAY] Order ${out_trade_no} completed`)
      }
    }
    res.send('success')
  } catch (err) {
    console.error('[ALIPAY] Callback error:', err)
    res.send('fail')
  }
})

// ====== 微信异步回调 ======
app.post('/api/user/credits/payment/callback/wechat', async (req, res) => {
  try {
    const tenpay = (await import('tenpay')).default
    const pay = new tenpay({
      appid: process.env.WECHAT_APP_ID,
      mchid: process.env.WECHAT_MCH_ID,
      partnerKey: process.env.WECHAT_API_KEY,
    })
    const result = await pay.notify(req.body)
    if (result) {
      const order = await Order.findOne({ orderNo: result.out_trade_no })
      if (order && order.status === 'pending') {
        order.status = 'paid'
        order.paidAt = new Date()
        order.tradeNo = result.transaction_id
        order.qrCode = undefined
        await order.save()
        await creditOrder(order)
        order.status = 'completed'
        order.completedAt = new Date()
        await order.save()
        console.log(`[WECHAT] Order ${result.out_trade_no} completed`)
      }
    }
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>')
  } catch (err) {
    console.error('[WECHAT] Callback error:', err)
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code></xml>')
  }
})

// ====== 管理员确认 ======
app.post('/api/user/credits/admin/confirm', async (req, res) => {
  const { orderNo, secret } = req.body
  if (secret !== 'aibrand-admin-2026') return res.status(403).json({ code: 403, message: '密钥错误' })
  try {
    const order = await Order.findOne({ orderNo })
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在' })
    if (order.status !== 'pending') {
      return res.status(400).json({ code: 400, message: `订单状态为 ${order.status}，不可确认` })
    }
    order.status = 'paid'; order.paidAt = new Date(); await order.save()
    await creditOrder(order)
    order.status = 'completed'; order.completedAt = new Date(); await order.save()
    console.log(`[ADMIN] Confirmed: ${orderNo}, ¥${order.amount} → ${order.credits} credits`)
    res.json({ code: 0, data: { status: 'completed', orderNo } })
  } catch (err) {
    console.error('[ADMIN] Confirm error:', err)
    res.status(500).json({ code: 500, message: '确认失败' })
  }
})

// ====== 管理员列表 ======
app.get('/api/user/credits/admin/list', async (req, res) => {
  const secret = req.headers['x-admin-secret']
  if (secret !== 'aibrand-admin-2026') return res.status(403).json({ code: 403, message: '密钥错误' })
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(100).lean()
    res.json({ code: 0, data: orders })
  } catch (err) {
    res.status(500).json({ code: 500, message: '查询失败' })
  }
})

// ====== 启动 ======
async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME })
    console.log(`[DB] Connected to MongoDB: ${DB_NAME}`)

    // 检查支付配置状态
    const alipayReady = !!(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY)
    const wechatReady = !!(process.env.WECHAT_APP_ID && process.env.WECHAT_MCH_ID && process.env.WECHAT_API_KEY)

    app.listen(PORT, () => {
      console.log(`========================================`)
      console.log(`  AiBrand 支付服务 v2`)
      console.log(`  Port: ${PORT}`)
      console.log(`========================================`)
      console.log(`  💳 支付宝: ${alipayReady ? '✅ 已配置' : '⬜ 未配置'}`)
      console.log(`  💳 微信支付: ${wechatReady ? '✅ 已配置' : '⬜ 未配置'}`)
      console.log(`  👤 手动确认: 始终可用`)
      console.log(`========================================`)
    })
  } catch (err) {
    console.error('Failed to start:', err)
    process.exit(1)
  }
}

start()
