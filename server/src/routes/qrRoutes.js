import express from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { parseToken } from './authRoutes.js';

const router = express.Router();
const prisma = new PrismaClient();

// 获取所有动态活码（区分开发者模式与创作者模式）
router.get('/', async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    let whereClause = {};

    if (!session || session.role !== 'developer') {
      if (session && session.userId) {
        whereClause = { OR: [{ userId: session.userId }, { userId: null }] };
      }
    }

    const qrCodes = await prisma.qRCode.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        exam: {
          select: { id: true, title: true, status: true, totalScore: true }
        }
      }
    });
    res.json({ success: true, data: qrCodes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 根据试卷 ID 获取二维码（若无则即时自动生成并返回）
router.get('/by-exam/:examId', async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    let qr = await prisma.qRCode.findFirst({
      where: { examId: req.params.examId },
      include: {
        exam: {
          select: { id: true, title: true, totalScore: true, passScore: true }
        }
      }
    });

    if (!qr) {
      const exam = await prisma.exam.findUnique({ where: { id: req.params.examId } });
      if (!exam) return res.status(404).json({ success: false, message: '试卷不存在' });

      const codeKey = 'qr_' + crypto.randomBytes(6).toString('hex');
      qr = await prisma.qRCode.create({
        data: {
          userId: exam.userId || (session ? session.userId : null),
          codeKey,
          title: exam.title + ' 专属答题码',
          examId: exam.id,
          isActive: true
        },
        include: {
          exam: {
            select: { id: true, title: true, totalScore: true, passScore: true }
          }
        }
      });
    }

    res.json({ success: true, data: qr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建新活码
router.post('/', async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    const { title, examId, customLogo, expireAt } = req.body;
    const codeKey = 'qr_' + crypto.randomBytes(6).toString('hex');

    const newQr = await prisma.qRCode.create({
      data: {
        userId: session ? session.userId : null,
        codeKey,
        title: title || '未命名活码',
        examId: examId || null,
        customLogo: customLogo || null,
        expireAt: expireAt ? new Date(expireAt) : null,
        isActive: true
      },
      include: {
        exam: {
          select: { id: true, title: true }
        }
      }
    });

    res.json({ success: true, data: newQr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新活码（切换关联试卷、更改启用/禁用状态等）
router.put('/:id', async (req, res) => {
  try {
    const { title, examId, isActive, customLogo, expireAt } = req.body;

    const updatedQr = await prisma.qRCode.update({
      where: { id: req.params.id },
      data: {
        title,
        examId: examId !== undefined ? examId : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        customLogo: customLogo !== undefined ? customLogo : undefined,
        expireAt: expireAt ? new Date(expireAt) : expireAt === null ? null : undefined
      },
      include: {
        exam: {
          select: { id: true, title: true }
        }
      }
    });

    res.json({ success: true, data: updatedQr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// C 端扫码公开重定向接口（获取活码绑定的活跃试卷及题目）
router.get('/redirect/:codeKey', async (req, res) => {
  try {
    const qr = await prisma.qRCode.findUnique({
      where: { codeKey: req.params.codeKey },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        }
      }
    });

    let targetExam = qr?.exam;
    let qrTitle = qr?.title || '在线标准化考核';

    // 智能全域容错兜底：若二维码被误删或为旧活码，自动平滑匹配最新生效试卷，确保考生扫码 100% 秒进考场！
    if (!qr || !targetExam) {
      let fallbackExam = await prisma.exam.findUnique({
        where: { id: req.params.codeKey },
        include: { questions: { orderBy: { orderIndex: 'asc' } } }
      });

      if (!fallbackExam) {
        fallbackExam = await prisma.exam.findFirst({
          where: { status: 'active' },
          orderBy: { updatedAt: 'desc' },
          include: { questions: { orderBy: { orderIndex: 'asc' } } }
        });
      }

      if (fallbackExam) {
        targetExam = fallbackExam;
        qrTitle = fallbackExam.title;
      } else {
        return res.status(404).json({ success: false, message: '暂无进行中的考试试卷，请联系管理员发布' });
      }
    } else {
      if (!qr.isActive) {
        return res.status(403).json({ success: false, message: '该考试二维码已暂停使用' });
      }

      if (qr.expireAt && new Date(qr.expireAt) < new Date()) {
        return res.status(403).json({ success: false, message: '该二维码已过期失效' });
      }

      await prisma.qRCode.update({
        where: { id: qr.id },
        data: { scanCount: { increment: 1 } }
      });
    }

    const examRules = JSON.parse(targetExam.examRules || '{}');
    const safeQuestions = targetExam.questions.map(q => ({
      id: q.id,
      type: q.type,
      stem: q.stem,
      options: q.options ? JSON.parse(q.options) : null,
      score: q.score,
      orderIndex: q.orderIndex
    }));

    res.json({
      success: true,
      data: {
        qrTitle,
        exam: {
          id: targetExam.id,
          title: targetExam.title,
          description: targetExam.description,
          durationMinutes: targetExam.durationMinutes,
          passScore: targetExam.passScore,
          totalScore: targetExam.totalScore,
          requiredFields: JSON.parse(targetExam.requiredFields || '["name"]'),
          examRules,
          questions: safeQuestions
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除活码
router.delete('/:id', async (req, res) => {
  try {
    await prisma.qRCode.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '活码删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
