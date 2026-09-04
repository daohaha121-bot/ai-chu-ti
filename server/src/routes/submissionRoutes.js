import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const router = express.Router();
const prisma = new PrismaClient();

// 自动判卷核心算法
function evaluateAnswers(questions, userAnswers) {
  let userScore = 0;
  let totalScore = 0;
  const questionResults = [];

  questions.forEach(q => {
    totalScore += q.score;
    const userAnswer = userAnswers[q.id];
    let isCorrect = false;

    if (q.type === 'single_choice' || q.type === 'true_false') {
      const cleanUser = String(userAnswer || '').trim().toLowerCase();
      const cleanTarget = String(q.answer || '').trim().toLowerCase();
      isCorrect = cleanUser === cleanTarget || cleanTarget.startsWith(cleanUser);
    } else if (q.type === 'multi_choice') {
      let uList = Array.isArray(userAnswer) ? userAnswer : String(userAnswer || '').split(',').map(s => s.trim());
      let tList = String(q.answer || '').split(',').map(s => s.trim());
      uList = uList.sort().join(',').toLowerCase();
      tList = tList.sort().join(',').toLowerCase();
      isCorrect = uList === tList && uList.length > 0;
    } else if (q.type === 'fill_blank') {
      const cleanUser = String(userAnswer || '').trim().toLowerCase();
      const cleanTarget = String(q.answer || '').trim().toLowerCase();
      isCorrect = cleanUser.length > 0 && (cleanUser === cleanTarget || cleanTarget.includes(cleanUser));
    } else if (q.type === 'short_answer') {
      // 简答题有内容即给基本分或满分
      isCorrect = String(userAnswer || '').trim().length > 5;
    }

    const earned = isCorrect ? q.score : 0;
    userScore += earned;

    questionResults.push({
      questionId: q.id,
      stem: q.stem,
      type: q.type,
      userAnswer,
      standardAnswer: q.answer,
      isCorrect,
      score: earned,
      totalScore: q.score,
      analysis: q.analysis
    });
  });

  return { userScore, totalScore, questionResults };
}

// C 端考生交卷接口
router.post('/', async (req, res) => {
  try {
    const { examId, userInfo, answers, switchCount = 0 } = req.body;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: '考试试卷不存在' });
    }

    const parsedUserInfo = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo;
    const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;

    // 检查限制答题次数
    const examRules = JSON.parse(exam.examRules || '{}');
    if (examRules.maxSubmissions && examRules.maxSubmissions > 0) {
      const identifier = parsedUserInfo.student_id || parsedUserInfo.name;
      if (identifier) {
        const existingCount = await prisma.submission.count({
          where: {
            examId,
            userInfo: { contains: identifier }
          }
        });
        if (existingCount >= examRules.maxSubmissions) {
          return res.status(403).json({ success: false, message: `您已达到最大允许答题次数 (${examRules.maxSubmissions} 次)` });
        }
      }
    }

    const { userScore, totalScore, questionResults } = evaluateAnswers(exam.questions, parsedAnswers);
    const isPassed = userScore >= exam.passScore;

    const submission = await prisma.submission.create({
      data: {
        examId,
        userInfo: JSON.stringify(parsedUserInfo),
        answers: JSON.stringify(parsedAnswers),
        score: userScore,
        totalScore,
        isPassed,
        switchCount: parseInt(switchCount) || 0
      }
    });

    res.json({
      success: true,
      data: {
        submissionId: submission.id,
        score: userScore,
        totalScore,
        isPassed,
        showAnswers: examRules.showAnswers !== false,
        details: examRules.showAnswers !== false ? questionResults : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 后台获取指定试卷的全量提交记录
router.get('/exam/:examId', async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { examId: req.params.examId },
      orderBy: { submittedAt: 'desc' }
    });

    const parsedSubmissions = submissions.map(s => ({
      ...s,
      userInfo: JSON.parse(s.userInfo || '{}'),
      answers: JSON.parse(s.answers || '{}')
    }));

    res.json({ success: true, data: parsedSubmissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 后台数据统计看板接口（平均分、最高分、错题率图表数据）
router.get('/analytics/:examId', async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.examId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    });

    if (!exam) return res.status(404).json({ success: false, message: '试卷不存在' });

    const submissions = await prisma.submission.findMany({
      where: { examId: req.params.examId }
    });

    const totalCount = submissions.length;
    if (totalCount === 0) {
      return res.json({
        success: true,
        data: {
          totalSubmissions: 0,
          avgScore: 0,
          maxScore: 0,
          minScore: 0,
          passRate: 0,
          questionAnalytics: exam.questions.map(q => ({
            id: q.id,
            stem: q.stem,
            type: q.type,
            errorRate: 0,
            correctRate: 0
          }))
        }
      });
    }

    const scores = submissions.map(s => s.score);
    const avgScore = Number((scores.reduce((a, b) => a + b, 0) / totalCount).toFixed(1));
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const passedCount = submissions.filter(s => s.isPassed).length;
    const passRate = Number(((passedCount / totalCount) * 100).toFixed(1));

    // 计算每道题的错题率与正确率
    const questionStats = exam.questions.map(q => {
      let correctCount = 0;
      submissions.forEach(sub => {
        const userAns = JSON.parse(sub.answers || '{}')[q.id];
        const res = evaluateAnswers([q], { [q.id]: userAns });
        if (res.userScore > 0) correctCount++;
      });

      const correctRate = Number(((correctCount / totalCount) * 100).toFixed(1));
      const errorRate = Number((100 - correctRate).toFixed(1));

      return {
        id: q.id,
        stem: q.stem,
        type: q.type,
        correctCount,
        errorCount: totalCount - correctCount,
        correctRate,
        errorRate
      };
    });

    res.json({
      success: true,
      data: {
        totalSubmissions: totalCount,
        avgScore,
        maxScore,
        minScore,
        passRate,
        questionAnalytics: questionStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Excel 成绩单一键导出
router.get('/export/excel/:examId', async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: req.params.examId } });
    const submissions = await prisma.submission.findMany({
      where: { examId: req.params.examId },
      orderBy: { submittedAt: 'desc' }
    });

    const rows = submissions.map((sub, index) => {
      const uInfo = JSON.parse(sub.userInfo || '{}');
      return {
        '序号': index + 1,
        '姓名': uInfo.name || '匿名',
        '学号/工号': uInfo.student_id || '-',
        '部门/班级': uInfo.department || '-',
        '得分': sub.score,
        '试卷总分': sub.totalScore,
        '是否合格': sub.isPassed ? '合格' : '不合格',
        '切屏防作弊次数': sub.switchCount,
        '提交时间': new Date(sub.submittedAt).toLocaleString()
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '成绩明细');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=exam_results_${req.params.examId}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
