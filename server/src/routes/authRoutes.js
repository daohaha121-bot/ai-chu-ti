import express from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

const DEV_PASSWORD = process.env.DEV_PASSWORD || 'admin888';

// 简单 Token 辅助
function createToken(userId, role) {
  const payload = JSON.stringify({ userId, role, time: Date.now() });
  return Buffer.from(payload).toString('base64');
}

export function parseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const raw = Buffer.from(authHeader.replace('Bearer ', ''), 'base64').toString('utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// 开发者专属登录（输入专属口令进入超级管理员开发者模式）
router.post('/developer-login', async (req, res) => {
  try {
    const { password } = req.body;
    if (password !== DEV_PASSWORD) {
      return res.status(401).json({ success: false, message: '开发者口令错误' });
    }

    // 查找或初始化开发者账号
    let devUser = await prisma.user.findFirst({ where: { role: 'developer' } });
    if (!devUser) {
      devUser = await prisma.user.create({
        data: {
          nickname: '超级开发者 (平台主理人)',
          role: 'developer',
          isVip: true,
          freeQuota: 999999
        }
      });
    }

    const token = createToken(devUser.id, 'developer');
    res.json({
      success: true,
      message: '欢迎回到超级开发者模式！',
      data: {
        token,
        user: devUser
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 微信扫码一键登录（支持真实或高保真一键授权模拟）
router.post('/wechat-login', async (req, res) => {
  try {
    const { openid = 'wx_' + crypto.randomBytes(4).toString('hex'), nickname = '微信考卷创作者' } = req.body;

    let user = await prisma.user.findUnique({ where: { openid } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          openid,
          nickname,
          role: 'user',
          freeQuota: 3, // 赠送 3 次免费体验额度
          isVip: false
        }
      });
    }

    const token = createToken(user.id, user.role);
    res.json({
      success: true,
      data: {
        token,
        user
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取当前登录人信息
router.get('/me', async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    if (!session || !session.userId) {
      return res.json({ success: true, data: null }); // 未登录
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        _count: { select: { exams: true, qrCodes: true, orders: true } }
      }
    });

    if (!user) {
      return res.json({ success: true, data: null });
    }

    // 检查 VIP 是否已过期
    let isVip = user.isVip;
    if (isVip && user.vipExpireAt && new Date(user.vipExpireAt) < new Date()) {
      isVip = false;
      await prisma.user.update({ where: { id: user.id }, data: { isVip: false } });
    }

    res.json({
      success: true,
      data: {
        ...user,
        isVip
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 开发者专属：获取全平台所有创作者用户列表
router.get('/users', async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    if (!session || session.role !== 'developer') {
      return res.status(403).json({ success: false, message: '需要开发者权限' });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { exams: true, qrCodes: true, orders: true } }
      }
    });

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
