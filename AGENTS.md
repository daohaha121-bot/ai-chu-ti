# Project AGENTS.md - AI 智能生成考试题及二维码后台管理系统 (问卷星模式)

## 1. 项目简介 (Project Overview)
本项目为一个类“问卷星”架构的 **AI 智能考试题生成、二维码活码分发与后台数据统计管理系统**。
支持大模型（OpenAI / DeepSeek / 智谱 AI / 百度文心等）基于用户输入的参数或上传的参考文件（PDF / Word / TXT / Markdown 等）自动生成试卷，提供全功能 H5 扫码答题端与可视化后台管理控制台。

## 2. 核心功能与业务规范 (Core Functional Requirements)

### 2.1 题型支持 (Question Types)
- **单选题 (Single Choice)**
- **多选题 (Multiple Choice)**
- **判断题 (True/False)**
- **填空题 (Fill in the Blank)**
- **简答题 (Short Answer / Subjective)**

### 2.2 AI 出题与人工编辑 (AI Generation & Editing)
- **出题配置参数**：题目数量、分值划分、难度等级、题目类型组合、考生入场需填字段（如姓名、学号/工号、部门/班级）、出题参考文件上传。
- **文件多格式解析**：支持上传 `.pdf`, `.docx`, `.txt`, `.md` 等文件作为 AI 知识库与出题参考背景上下文。
- **二次编辑**：试卷生成后，管理员可在后台自由修改题干、增删题目、修改选项及正确答案、重新设定单题分值与解析。

### 2.3 C 端 H5 扫码答题与考试规则控制 (Student Exam Rules)
- **免登录**：支持扫码即答，无需账号注册登录（可选配置入场填写姓名/工号）。
- **考试规则配置**：
  1. **考试限时**：倒计时自动强制交卷。
  2. **答题次数限制**：支持单设备/单 IP/单考生限制答题 1 次或特定次数。
  3. **成绩与解析展示**：可开关“交卷后即时显示得分与完整答案解析”。
  4. **防作弊机制**：切屏监控，记录切屏次数，达到上限强制自动交卷。
  5. **无操作检测**：检测无操作达到指定秒数弹出提醒，到期后自动交卷。

### 2.4 二维码与动态活码管理 (Dynamic QR Code System)
- **活码重定向**：二维码生成后固定不变，管理员可在后台随时切换所关联的试卷、开启/关闭考试状态、设置二维码生效/失效时间。
- **外观定制**：支持调整二维码样式、嵌入平台/机构 Logo、渲染高清导出图片。

### 2.5 后台统计、品牌定制与多格式导出 (Analytics & Branding Export)
- **答题数据统计**：考生成绩明细列表、得分汇总、平均分、最高分、最低分、各题错题率与正确率分布柱状/饼状图。
- **平台标识与品牌定制**：支持后台修改平台 Logo、水印与页脚标识，生成的成绩报告单/试卷可附带可控的品牌标识。
- **多格式导出**：支持成绩单及试卷一键导出为 **Excel (.xlsx)**、**PDF** 及 **高清图片 (.png/.jpg)**。

### 2.6 局域网部署与 GitHub CI/CD 自动同步上线 (Deployment & Git Sync)
- **部署环境**：局域网环境部署（Self-hosted / LAN Deployment）。
- **GitHub 官方仓库**：`https://github.com/daohaha121-bot/ai-chu-ti`
- **自动推送机制**：所有代码变更及里程碑完成时，AI Agent 需自动执行 `git add`, `git commit`, `git push origin main` 同步更新仓库并确保部署服务实时生效。

### 2.7 预留付费扩展机制 (Payment & Monetization Interface)
- **支付模块接口预留**：内置轻量级付费规则中间件/接口占位符（支持微信支付 / 支付宝支付 SDK 配置）。
- **付费应用场景预留**：如“扫码付费答题”、“高级试卷导出”、“活码高级功能解锁”等，方便后续快速启用商业化。

---

## 3. 技术栈规范 (Technical Architecture & Stack)

- **前端架构 (Frontend)**：Vue 3 + Vite + TypeScript + Pinia + Vue Router + TailwindCSS / Element Plus (H5 自适应移动端 + Web 后台系统)
- **后端架构 (Backend)**：Node.js (Express / NestJS) 或 Python (FastAPI) + RESTful API
- **数据库 (Database)**：SQLite (开发/局域网便捷版) 或 PostgreSQL / MySQL + Prisma ORM / TypeORM
- **AI 模型对接 (AI Integration)**：标准 OpenAI API 格式兼容层（支持 DeepSeek, ChatGPT, 智谱 GLM, 百度文心等大模型）
- **文件解析库 (File Parser)**：pdf-parse / mammoth (Docx) / text extraction
- **二维码与导出 (QR & Export)**：qrcode.vue / html2canvas / jspdf / xlsx (SheetJS)
- **CI/CD 自动化**：Git auto-commit & push workflow to GitHub repository.

---

## 4. 业务数据模型规范 (Data Schema Architecture)

```prisma
// 试卷主表
model Exam {
  id              String         @id @default(uuid())
  title           String
  description     String?
  durationMinutes Int            @default(0) // 0 表示不限时
  passScore       Float          @default(60)
  totalScore      Float          @default(100)
  requiredFields  String         // JSON: ["name", "student_id", "department"]
  examRules       String         // JSON: { maxSubmissions: 1, showAnswers: true, preventCheating: true, idleTimeoutSeconds: 60 }
  status          String         @default("active") // active, closed, draft
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  questions       Question[]
  qrCodes         QRCode[]
  submissions     Submission[]
}

// 题目表
model Question {
  id          String   @id @default(uuid())
  examId      String
  exam        Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  type        String   // single_choice, multi_choice, true_false, fill_blank, short_answer
  stem        String   // 题干
  options     String?  // JSON: ["选项A", "选项B", "选项C", "选项D"]
  answer      String   // 标准答案
  score       Float    @default(5)
  analysis    String?  // 解析
  orderIndex  Int      @default(0)
}

// 动态活码表
model QRCode {
  id          String   @id @default(uuid())
  codeKey     String   @unique
  title       String
  examId      String?
  exam        Exam?    @relation(fields: [examId], references: [id], onDelete: SetNull)
  isActive    Boolean  @default(true)
  expireAt    DateTime?
  scanCount   Int      @default(0)
  customLogo  String?
  createdAt   DateTime @default(now())
}

// 考生提交记录表
model Submission {
  id          String   @id @default(uuid())
  examId      String
  exam        Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  userInfo    String   // JSON: { name: "张三", student_id: "2026001" }
  answers     String   // JSON: { questionId: userAnswer }
  score       Float
  totalScore  Float
  isPassed    Boolean  @default(false)
  switchCount Int      @default(0) // 切屏次数
  submittedAt DateTime @default(now())
}

// 平台系统设置表（品牌标识、支付配置预留）
model SystemConfig {
  id            String   @id @default("default")
  platformName  String   @default("AI 智能考试平台")
  logoUrl       String?
  watermarkText String?
  paymentConfig String?  // JSON: { enabled: false, provider: "alipay|wechat", price: 0 }
}
```

---

## 5. Agent 协作规范 (Agent Operating Principles)

1. **版本控制自动化 (Git Rule)**：所有完成的开发功能与修改，必须自动执行 git add/commit 并 push 到 `https://github.com/daohaha121-bot/ai-chu-ti.git`。
2. **扩展预留**：所有界面和后端 API 的设计，均包含对简单支付（微信/支付宝）、自定义品牌 Logo、导出多格式的支持。
3. **响应式设计**：答题端必须 100% 完美适配 iOS / Android 各种尺寸移动端屏幕；后台管理端适配桌面大屏浏览器。

---

## 6. 开发里程碑与任务清单 (Milestones)

- [x] Phase 1: 确定全面需求细节与设计 `AGENTS.md`
- [ ] Phase 2: 初始化项目工程结构、数据库 ORM (SQLite/Prisma) 与 Git 仓库对接
- [ ] Phase 3: 开发 AI 出题引擎（支持多格式文件上传解析与结构化试卷生成）
- [ ] Phase 4: 开发试卷在线二次编辑器与活码管理中间件
- [ ] Phase 5: 开发 C 端 H5 答题界面（防作弊切屏、无操作检测倒计时、实时打分）
- [ ] Phase 6: 开发后台数据统计看板、多格式导出 (Excel/PDF/PNG) 与品牌/付费接口预留
- [ ] Phase 7: 局域网部署测试、一键自动 Git 推送上线
