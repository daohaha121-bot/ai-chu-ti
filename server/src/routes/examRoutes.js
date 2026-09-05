import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { generateExamWithAI, parseFileContent } from '../services/aiService.js';
import { parseToken } from './authRoutes.js';

const router = express.Router();
const prisma = new PrismaClient();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

// AI 出题生成接口（校验额度与 VIP 权限）
router.post('/generate', upload.single('referenceFile'), async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    let currentUser = null;

    if (session && session.userId) {
      currentUser = await prisma.user.findUnique({ where: { id: session.userId } });
      if (currentUser && currentUser.role !== 'developer' && !currentUser.isVip) {
        if (currentUser.freeQuota <= 0) {
          return res.status(403).json({
            success: false,
            code: 'QUOTA_EXPIRED',
            message: '您的免费出题额度已用完，请升级开通 VIP 畅享无限出题！'
          });
        }
      }
    }

    const {
      title,
      topic,
      questionTypes,
      totalQuestions,
      difficulty,
      totalScore,
      requiredFields,
      examRules
    } = req.body;

    let parsedTypes = ['single_choice', 'multi_choice', 'true_false', 'fill_blank', 'short_answer'];
    if (questionTypes) {
      parsedTypes = typeof questionTypes === 'string' ? JSON.parse(questionTypes) : questionTypes;
    }

    let referenceText = '';
    if (req.file) {
      referenceText = await parseFileContent(req.file);
    }

    const aiResult = await generateExamWithAI({
      title: title || topic || 'AI 智能试卷',
      topic: topic || '综合测试',
      questionTypes: parsedTypes,
      totalQuestions: parseInt(totalQuestions) || 10,
      difficulty: difficulty || 'medium',
      totalScore: parseFloat(totalScore) || 100,
      referenceText
    });

    const newExam = await prisma.exam.create({
      data: {
        userId: currentUser ? currentUser.id : null,
        title: aiResult.title || title || 'AI 智能试卷',
        description: aiResult.description || '基于 AI 自动生成的综合试卷',
        passScore: parseFloat(aiResult.passScore) || 60,
        totalScore: parseFloat(aiResult.totalScore) || 100,
        requiredFields: typeof requiredFields === 'string' ? requiredFields : JSON.stringify(requiredFields || ['name']),
        examRules: typeof examRules === 'string' ? examRules : JSON.stringify(examRules || {
          maxSubmissions: 1,
          showAnswers: true,
          preventCheating: true,
          idleTimeoutSeconds: 60
        }),
        questions: {
          create: (aiResult.questions || []).map((q, idx) => ({
            type: q.type || 'single_choice',
            stem: q.stem || '题干缺失',
            options: q.options ? JSON.stringify(q.options) : null,
            answer: typeof q.answer === 'object' ? JSON.stringify(q.answer) : String(q.answer || ''),
            score: parseFloat(q.score) || 10,
            analysis: q.analysis || '',
            orderIndex: idx
          }))
        }
      },
      include: {
        questions: true
      }
    });

    // 扣减非 VIP 用户的免费出题额度
    if (currentUser && currentUser.role !== 'developer' && !currentUser.isVip) {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { freeQuota: { decrement: 1 } }
      });
    }

    res.json({ success: true, data: newExam });
  } catch (error) {
    console.error('AI 出题失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取试卷列表（开发者看全站，普通创作者只看自己）
router.get('/', async (req, res) => {
  try {
    const session = parseToken(req.headers.authorization);
    let whereClause = {};

    if (!session || session.role !== 'developer') {
      if (session && session.userId) {
        whereClause = { OR: [{ userId: session.userId }, { userId: null }] };
      }
    }

    const exams = await prisma.exam.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { nickname: true, role: true } },
        _count: {
          select: { questions: true, submissions: true, qrCodes: true }
        }
      }
    });
    res.json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取试卷详情及题目
router.get('/:id', async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
    if (!exam) return res.status(404).json({ success: false, message: '试卷不存在' });

    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新/二次编辑试卷
router.put('/:id', async (req, res) => {
  try {
    const { title, description, passScore, totalScore, requiredFields, examRules, status, questions } = req.body;

    const updatedExam = await prisma.$transaction(async (tx) => {
      if (questions) {
        await tx.question.deleteMany({ where: { examId: req.params.id } });
      }

      return await tx.exam.update({
        where: { id: req.params.id },
        data: {
          title,
          description,
          passScore: parseFloat(passScore),
          totalScore: parseFloat(totalScore),
          requiredFields: typeof requiredFields === 'string' ? requiredFields : JSON.stringify(requiredFields),
          examRules: typeof examRules === 'string' ? examRules : JSON.stringify(examRules),
          status,
          questions: questions ? {
            create: questions.map((q, idx) => ({
              type: q.type,
              stem: q.stem,
              options: Array.isArray(q.options) ? JSON.stringify(q.options) : q.options,
              answer: typeof q.answer === 'object' ? JSON.stringify(q.answer) : String(q.answer || ''),
              score: parseFloat(q.score) || 5,
              analysis: q.analysis || '',
              orderIndex: idx
            }))
          } : undefined
        },
        include: { questions: true }
      });
    });

    res.json({ success: true, data: updatedExam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除试卷
router.delete('/:id', async (req, res) => {
  try {
    await prisma.exam.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '试卷删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
