import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { parseFileContent } from '../services/aiService.js';
import { parseToken } from './authRoutes.js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

const getApiKey = () => process.env.AI_API_KEY || '';

/**
 * 1. 下载标准 Excel 题库导入模板
 */
router.get('/template', (req, res) => {
  try {
    const wb = xlsx.utils.book_new();

    const templateData = [
      ['题型(必填)', '题干内容(必填)', '选项A', '选项B', '选项C', '选项D', '正确答案(必填)', '单题分值', '解析说明'],
      ['单选题', '中华人民共和国的首都是哪座城市？', '北京', '上海', '广州', '深圳', 'A. 北京', 10, '北京是中华人民共和国的首都。'],
      ['多选题', '下列属于中国四大古都的城市有哪些？', '西安', '洛阳', '南京', '重庆', 'A,B,C', 10, '中国四大古都为西安、洛阳、南京、北京。'],
      ['判断题', '光在真空中传播的速度大约是每秒30万公里。', '正确', '错误', '', '', '正确', 10, '真空中的光速约为 299,792,458 米/秒。'],
      ['填空题', '直角三角形中两直角边的平方和等于斜边的____。', '', '', '', '', '平方', 10, '勾股定理：a² + b² = c²。'],
      ['简答题', '简述面向对象程序设计（OOP）的三大基本特征。', '', '', '', '', '封装、继承、多态。', 20, '三大特性是面向对象编程的基石。']
    ];

    const ws = xlsx.utils.aoa_to_sheet(templateData);

    // 设置列宽
    ws['!cols'] = [
      { wch: 14 }, // 题型
      { wch: 45 }, // 题干
      { wch: 20 }, // 选项A
      { wch: 20 }, // 选项B
      { wch: 20 }, // 选项C
      { wch: 20 }, // 选项D
      { wch: 20 }, // 答案
      { wch: 10 }, // 分值
      { wch: 35 }  // 解析
    ];

    xlsx.utils.book_append_sheet(wb, ws, '题库导入模板');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="exam_import_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('生成 Excel 模板失败:', error);
    res.status(500).json({ success: false, message: '生成导入模板失败: ' + error.message });
  }
});

/**
 * 辅助函数：标准化题型字符串
 */
function normalizeQuestionType(rawType = '', hasOptions = false) {
  const t = String(rawType).trim();
  if (t.includes('单选')) return 'single_choice';
  if (t.includes('多选')) return 'multi_choice';
  if (t.includes('判断')) return 'true_false';
  if (t.includes('填空')) return 'fill_blank';
  if (t.includes('简答') || t.includes('问答') || t.includes('主观')) return 'short_answer';
  if (hasOptions) return 'single_choice';
  return 'short_answer';
}

/**
 * 2. 上传并解析标准 Excel 题库表格（规则秒级解析，无 AI 消耗）
 */
router.post('/excel', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '请上传 Excel 文件' });
  }

  try {
    const session = parseToken(req.headers.authorization);
    const userId = session?.userId || null;

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Excel 文件中未发现有效工作表 (Sheet)' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // 二维数组模式

    if (!rawRows || rawRows.length < 2) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Excel 表格数据为空或缺少表头行' });
    }

    // 自动寻找表头索引
    const headerRow = rawRows[0].map(h => String(h || '').trim());
    const findColIdx = (keywords) => {
      return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const colType = findColIdx(['题型', '类型', 'type']);
    const colStem = findColIdx(['题干', '题目', '内容', 'stem', 'question']);
    const colOptA = findColIdx(['选项A', 'A', '选项1']);
    const colOptB = findColIdx(['选项B', 'B', '选项2']);
    const colOptC = findColIdx(['选项C', 'C', '选项3']);
    const colOptD = findColIdx(['选项D', 'D', '选项4']);
    const colOptE = findColIdx(['选项E', 'E', '选项5']);
    const colOptF = findColIdx(['选项F', 'F', '选项6']);
    const colAns  = findColIdx(['答案', '正确答案', 'answer', '标准答案']);
    const colScore = findColIdx(['分值', '分数', '分', 'score']);
    const colAna  = findColIdx(['解析', '说明', 'analysis', '考点']);

    const questions = [];

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const stem = colStem !== -1 ? String(row[colStem] || '').trim() : '';
      if (!stem) continue; // 题干为空则跳过

      // 提取选项
      const rawOptions = [];
      const addOpt = (idx, label) => {
        if (idx !== -1 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
          const val = String(row[idx]).trim();
          if (val.startsWith(label + '.') || val.startsWith(label + '、') || val.startsWith(label + ' ')) {
            rawOptions.push(val);
          } else {
            rawOptions.push(`${label}. ${val}`);
          }
        }
      };

      addOpt(colOptA, 'A');
      addOpt(colOptB, 'B');
      addOpt(colOptC, 'C');
      addOpt(colOptD, 'D');
      addOpt(colOptE, 'E');
      addOpt(colOptF, 'F');

      const rawType = colType !== -1 ? row[colType] : '';
      const type = normalizeQuestionType(rawType, rawOptions.length > 0);

      // 判断题若无选项，默认注入 正确/错误
      let finalOptions = rawOptions;
      if (type === 'true_false' && finalOptions.length === 0) {
        finalOptions = ['正确', '错误'];
      }

      const answer = colAns !== -1 ? String(row[colAns] || '').trim() : '';
      const score = colScore !== -1 && !isNaN(parseFloat(row[colScore])) ? parseFloat(row[colScore]) : (type === 'short_answer' ? 10 : 5);
      const analysis = colAna !== -1 ? String(row[colAna] || '').trim() : '';

      questions.push({
        type,
        stem,
        options: finalOptions.length > 0 ? finalOptions : null,
        answer: answer || (type === 'true_false' ? '正确' : (finalOptions[0] || '')),
        score,
        analysis,
        orderIndex: questions.length
      });
    }

    if (questions.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: '未能从表格中识别出有效题目，请检查是否填写了题干内容。' });
    }

    const {
      title,
      description,
      passScore,
      durationMinutes,
      requiredFields,
      examRules
    } = req.body;

    const totalScore = questions.reduce((sum, q) => sum + (parseFloat(q.score) || 0), 0);
    const calculatedPassScore = passScore ? parseFloat(passScore) : Math.round(totalScore * 0.6);

    const originalFilename = req.file.originalname ? path.parse(req.file.originalname).name : 'Excel 导入试卷';

    const newExam = await prisma.exam.create({
      data: {
        userId,
        title: title || originalFilename,
        description: description || `由 Excel 题库表格直接导入（共 ${questions.length} 题）`,
        durationMinutes: parseInt(durationMinutes) || 0,
        passScore: calculatedPassScore,
        totalScore,
        requiredFields: typeof requiredFields === 'string' ? requiredFields : JSON.stringify(requiredFields || ['name']),
        examRules: typeof examRules === 'string' ? examRules : JSON.stringify(examRules || {
          maxSubmissions: 1,
          showAnswers: true,
          preventCheating: true,
          idleTimeoutSeconds: 60
        }),
        questions: {
          create: questions.map(q => ({
            type: q.type,
            stem: q.stem,
            options: q.options ? JSON.stringify(q.options) : null,
            answer: q.answer,
            score: q.score,
            analysis: q.analysis,
            orderIndex: q.orderIndex
          }))
        }
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    fs.unlinkSync(req.file.path);
    res.json({ success: true, data: newExam, count: questions.length });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('导入 Excel 题库失败:', error);
    res.status(500).json({ success: false, message: '解析 Excel 失败: ' + error.message });
  }
});

/**
 * 3. 上传 Word / PDF / TXT / MD 文档并通过 AI 智能识别提取题库
 */
router.post('/ai-parse', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '请上传文档文件' });
  }

  try {
    const session = parseToken(req.headers.authorization);
    let currentUser = null;

    if (session && session.userId) {
      currentUser = await prisma.user.findUnique({ where: { id: session.userId } });
      if (currentUser && currentUser.role !== 'developer' && !currentUser.isVip) {
        if (currentUser.freeQuota <= 0) {
          fs.unlinkSync(req.file.path);
          return res.status(403).json({
            success: false,
            code: 'QUOTA_EXPIRED',
            message: '您的出题额度已用完，请升级 VIP 会员畅享无限题库识别与出题！'
          });
        }
      }
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, message: '系统未配置 AI API Key，请检查后台环境配置。' });
    }

    // 提取文件纯文本内容
    const documentText = await parseFileContent(req.file);
    if (!documentText || documentText.trim().length < 10) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: '未能从文件中提取出足够的文字内容，请确认文件非空白或扫描图片。' });
    }

    const {
      title,
      description,
      passScore,
      durationMinutes,
      requiredFields,
      examRules
    } = req.body;

    const originalFilename = req.file.originalname ? path.parse(req.file.originalname).name : '文档智能提取试卷';

    // 智能提取 Prompt
    const prompt = `你是一位专业的试卷与题库解析专家。用户上传了一份现成的题库/试卷文档，请从以下文本内容中，精准提取并结构化所有现成的题目、题型、选项、标准答案、分值与解析。

【核心原则】
1. 真实忠实：这是从用户既有题库中提取题目，请忠实保留原题干和选项，不要自行臆造新题目。
2. 答案智能关联：若原文档将答案统一列在文档末尾或附录，请务必准确对应回每一题。
3. 分值规则：若原题未标明分值，单选/判断默认每题 5 分，多选/填空默认每题 5 分，简答题默认每题 10 分。
4. 题型识别：单选题(single_choice)、多选题(multi_choice)、判断题(true_false)、填空题(fill_blank)、简答题(short_answer)。
5. 判断题选项：若原题没有选项，请统一填充 ["正确", "错误"]。
6. 输出必须且仅为一个严格的标准 JSON 对象，严禁包裹其它任何多余解释文字。

【严格 JSON 输出格式规范】
{
  "title": "${title || originalFilename}",
  "description": "由题库文档智能提取生成",
  "questions": [
    {
      "type": "single_choice",
      "stem": "题目干内容...",
      "options": ["A. 选项内容1", "B. 选项内容2", "C. 选项内容3", "D. 选项内容4"],
      "answer": "A. 选项内容1",
      "score": 5,
      "analysis": "原文档中的解析内容（若无则给出简要考点）"
    },
    {
      "type": "true_false",
      "stem": "判断题干...",
      "options": ["正确", "错误"],
      "answer": "正确",
      "score": 5,
      "analysis": ""
    },
    {
      "type": "fill_blank",
      "stem": "填空题干（下划线或括号标明空格）...",
      "options": null,
      "answer": "正确填空答案",
      "score": 5,
      "analysis": ""
    },
    {
      "type": "short_answer",
      "stem": "简答题干...",
      "options": null,
      "answer": "参考解答要点",
      "score": 10,
      "analysis": ""
    }
  ]
}

【以下是待提取的文档全文内容】
${documentText.slice(0, 15000)}
`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, message: `AI 提取服务响应失败 (${response.status}): ${errorText}` });
    }

    const aiResData = await response.json();
    const textResult = aiResData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, message: 'AI 未能返回有效的题目解析内容。' });
    }

    const cleanJsonText = textResult.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    let parsedData = {};
    try {
      parsedData = JSON.parse(cleanJsonText);
    } catch (parseErr) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, message: 'AI 返回的数据无法解析为有效 JSON: ' + parseErr.message });
    }

    const questions = parsedData.questions || [];
    if (questions.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: '未能从文档中提取出任何试题，请确认文档内容是否包含题目。' });
    }

    const totalScore = questions.reduce((sum, q) => sum + (parseFloat(q.score) || 5), 0);
    const calculatedPassScore = passScore ? parseFloat(passScore) : Math.round(totalScore * 0.6);

    const newExam = await prisma.exam.create({
      data: {
        userId: currentUser ? currentUser.id : null,
        title: parsedData.title || title || originalFilename,
        description: description || `由题库文档智能识别生成（共 ${questions.length} 题）`,
        durationMinutes: parseInt(durationMinutes) || 0,
        passScore: calculatedPassScore,
        totalScore,
        requiredFields: typeof requiredFields === 'string' ? requiredFields : JSON.stringify(requiredFields || ['name']),
        examRules: typeof examRules === 'string' ? examRules : JSON.stringify(examRules || {
          maxSubmissions: 1,
          showAnswers: true,
          preventCheating: true,
          idleTimeoutSeconds: 60
        }),
        questions: {
          create: questions.map((q, idx) => ({
            type: q.type || 'single_choice',
            stem: q.stem || '题干缺失',
            options: q.options ? JSON.stringify(q.options) : null,
            answer: typeof q.answer === 'object' ? JSON.stringify(q.answer) : String(q.answer || ''),
            score: parseFloat(q.score) || 5,
            analysis: q.analysis || '',
            orderIndex: idx
          }))
        }
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    // 扣除免费额度（非 VIP 普通用户）
    if (currentUser && currentUser.role !== 'developer' && !currentUser.isVip) {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { freeQuota: { decrement: 1 } }
      });
    }

    fs.unlinkSync(req.file.path);
    res.json({ success: true, data: newExam, count: questions.length });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('AI 识别文档题库失败:', error);
    res.status(500).json({ success: false, message: 'AI 识别失败: ' + error.message });
  }
});

export default router;
