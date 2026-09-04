import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const getApiKey = () => process.env.AI_API_KEY || '';

/**
 * 解析上传的参考文件文本内容 (PDF, Word, TXT, MD)
 */
export async function parseFileContent(file) {
  if (!file) return '';
  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  const buffer = fs.readFileSync(file.path);

  try {
    if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      return data.text || '';
    } else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } else {
      return buffer.toString('utf-8');
    }
  } catch (err) {
    console.error('解析文件失败:', err);
    return buffer.toString('utf-8');
  }
}

/**
 * 调用 Google Gemini API 智能生成结构化试卷 JSON
 */
export async function generateExamWithAI({
  title,
  topic,
  questionTypes = ['single_choice', 'multi_choice', 'true_false', 'fill_blank', 'short_answer'],
  totalQuestions = 10,
  difficulty = 'medium',
  totalScore = 100,
  referenceText = ''
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('未配置 AI API Key，请在 .env 中设置 AI_API_KEY。');
  }

  const prompt = `你是一位专业的出题专家。请根据以下配置和出题参考内容，生成一份完整的结构化试卷。

【出题配置参数】
- 试卷名称: ${title || topic || '综合测试卷'}
- 主题/知识点: ${topic || '综合考核'}
- 难度等级: ${difficulty} (easy:简单, medium:中等, hard:困难)
- 题目数量: ${totalQuestions} 题
- 总分值: ${totalScore} 分
- 需覆盖题型: ${questionTypes.join(', ')}

${referenceText ? `【出题参考资料内容】\n${referenceText.slice(0, 10000)}\n` : ''}

【必须恪守的输出 JSON 格式规范】
你必须且仅输出标准的 JSON 格式对象。
JSON 必须严格按照以下结构：

{
  "title": "${title || topic || '综合测试卷'}",
  "description": "基于 AI 自动生成的综合考试卷",
  "passScore": ${Math.round(totalScore * 0.6)},
  "totalScore": ${totalScore},
  "questions": [
    {
      "type": "single_choice",
      "stem": "题干描述...",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "answer": "A. 选项1",
      "score": 10,
      "analysis": "解析说明..."
    }
  ]
}`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResult) {
    throw new Error('Gemini API 未返回有效内容。');
  }

  const cleanJsonText = textResult.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const examData = JSON.parse(cleanJsonText);
  return examData;
}
