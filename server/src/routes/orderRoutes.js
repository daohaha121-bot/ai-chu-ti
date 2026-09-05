import express from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { parseToken } from './authRoutes.js';

const router = express.Router();
const prisma = new PrismaClient();

// 系统默认定价策略
const DEFAULT_PLANS = [
  {
    type: 'quota_10',
    name: '10 次 AI 出题体验加油包',
    price: 9.9,
    desc: '增加 10 次试卷生成额度，永久有效'
  },
  {
    type: 'vip_month',
    name: '月度 VIP 创作者会员',
    price: 29.9,
    desc: '30 天内无限 AI 出题、解锁切屏监控、无限制导出 Excel/图片',
    recommend: true
  },
  {
    type: 'vip_year',
    name: '年度旗舰 VIP 会员',
    price: 199.0,
    desc: '365 天畅享全部 VIP 高级权益，专属服务支持'
  }
];

// 获取变现套餐定价列表
router.get('/plans', async (req, res) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
    let plans = DEFAULT_PLANS;
    if (config && config.pricingPlans) {
      plans = JSON.parse(config.pricingPlans);
    }
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 开发者保存修改定价套餐
router.put('/plans', async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    if (!session || session.role !== 'developer') {
      return res.status(403).json({ success: false, message: '需要开发者权限' });
    }

    const { plans } = req.body;
    await prisma.systemConfig.upsert({
      where: { id: 'default' },
      update: { pricingPlans: JSON.stringify(plans) },
      create: { id: 'default', pricingPlans: JSON.stringify(plans) }
    });

    res.json({ success: true, message: '变现套餐修改已生效！' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建变现订单
router.post('/create', async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    if (!session || !session.userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const { planType } = req.body;
    const plan = DEFAULT_PLANS.find(p => p.type === planType);
    if (!plan) {
      return res.status(400).json({ success: false, message: '无效的购买套餐' });
    }

    const orderNo = 'PAY_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex').toUpperCase();

    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: session.userId,
        planType: plan.type,
        planName: plan.name,
        amount: plan.price,
        status: 'pending'
      }
    });

    // 微信 Native 扫码支付链接占位符 (可无缝对接微信支付统一下单 API)
    const wechatPayUrl = `weixin://wxpay/bizpayurl?pr=${order.orderNo}`;

    res.json({
      success: true,
      data: {
        order,
        wechatPayUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 模拟支付成功 / 支付回调核心处理
router.post('/pay-mock', async (req, res) => {
  try {
    const { orderNo } = req.body;
    const order = await prisma.order.findUnique({ where: { orderNo } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (order.status === 'paid') {
      return res.json({ success: true, message: '订单已完成支付' });
    }

    const now = new Date();
    let vipExpireAt = null;

    if (order.planType === 'vip_month') {
      vipExpireAt = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    } else if (order.planType === 'vip_year') {
      vipExpireAt = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
    }

    // 更新用户权益与订单状态
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid', paidAt: now }
      }),
      prisma.user.update({
        where: { id: order.userId },
        data: {
          isVip: ['vip_month', 'vip_year'].includes(order.planType) ? true : undefined,
          vipExpireAt: vipExpireAt ? vipExpireAt : undefined,
          freeQuota: order.planType === 'quota_10' ? { increment: 10 } : undefined
        }
      })
    ]);

    res.json({ success: true, message: '支付成功！权益已即时生效到账！' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 开发者专属：全站变现收益看板
router.get('/analytics', async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    if (!session || session.role !== 'developer') {
      return res.status(403).json({ success: false, message: '需要开发者权限' });
    }

    const orders = await prisma.order.findMany({
      where: { status: 'paid' },
      orderBy: { paidAt: 'desc' },
      include: { user: { select: { nickname: true, role: true } } }
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
    const totalOrders = orders.length;

    const vipUsersCount = await prisma.user.count({
      where: { isVip: true }
    });

    res.json({
      success: true,
      data: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        vipUsersCount,
        recentOrders: orders.slice(0, 50)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
