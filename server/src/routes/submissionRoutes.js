import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const router = express.Router();
const prisma = new PrismaClient();

// 自动判卷核心算法
function evaluateAnswers(questions, userAnswers = {}) {
  let userScore = 0;
  let totalScore = 0;
  const questionResults = [];

  questions.forEach(q => {
    totalScore += q.score;
    const rawAnswer = userAnswers ? userAnswers[q.id] : undefined;
    let isCorrect = false;

    // 严密判定考生是否真正作答（非 undefined/null，且去除首尾空格后有实际内容）
    const hasAnswered = rawAnswer !== undefined && rawAnswer !== null && (
      Array.isArray(rawAnswer) 
        ? rawAnswer.filter(item => String(item || '').trim().length > 0).length > 0 
        : String(rawAnswer).trim().length > 0
    );

    let displayUserAnswer = hasAnswered ? rawAnswer : null;

    if (hasAnswered) {
      if (q.type === 'single_choice' || q.type === 'true_false') {
        const cleanUser = String(rawAnswer).trim().toLowerCase();
        const cleanTarget = String(q.answer || '').trim().toLowerCase();
        // 必须非空且完全匹配，或标准答案以该选项开头（如 "A" 匹配 "A. 选项内容"）
        isCorrect = cleanUser === cleanTarget || (cleanUser.length > 0 && cleanTarget.startsWith(cleanUser));
      } else if (q.type === 'multi_choice') {
        let uList = Array.isArray(rawAnswer) ? rawAnswer : String(rawAnswer).split(',').map(s => s.trim());
        uList = uList.filter(s => s.length > 0);
        let tList = String(q.answer || '').split(',').map(s => s.trim()).filter(s => s.length > 0);
        uList = uList.sort().join(',').toLowerCase();
        tList = tList.sort().join(',').toLowerCase();
        isCorrect = uList.length > 0 && uList === tList;
      } else if (q.type === 'fill_blank') {
        const cleanUser = String(rawAnswer).trim().toLowerCase();
        const cleanTarget = String(q.answer || '').trim().toLowerCase();
        isCorrect = cleanUser.length > 0 && (cleanUser === cleanTarget || cleanTarget.includes(cleanUser));
      } else if (q.type === 'short_answer') {
        // 简答题需大于 5 个字且有实质内容
        isCorrect = String(rawAnswer).trim().length > 5;
      }
    } else {
      // 未作答一律判定为回答错误，不得分
      isCorrect = false;
    }

    const earned = isCorrect ? q.score : 0;
    userScore += earned;

    questionResults.push({
      questionId: q.id,
      stem: q.stem,
      type: q.type,
      userAnswer: displayUserAnswer,
      hasAnswered,
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

// 删除某位考生的单条答题记录（用于补考或清理误测数据）
router.delete('/:id', async (req, res) => {
  try {
    await prisma.submission.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: '成绩记录已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
