<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- 头部说明 -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
          <el-icon class="text-blue-600"><UploadFilled /></el-icon>
          直接上传题库生成试卷
        </h3>
        <p class="text-xs text-gray-500 mt-0.5">
          已有成套题库无需重新 AI 编造，一键上传即可生成活码、扫码答题并全量统计成绩
        </p>
      </div>
      <el-button @click="$router.push('/admin/exams')">
        ← 返回试卷库
      </el-button>
    </div>

    <!-- 导入模式选项卡 -->
    <el-card class="shadow-sm border-0 rounded-xl">
      <el-tabs v-model="activeTab" class="import-tabs">
        <!-- 选项卡 1: Excel 标准模板秒级导入 -->
        <el-tab-pane label="📊 Excel 标准模板极速导入 (推荐·零消耗)" name="excel">
          <div class="space-y-5 pt-2">
            <!-- 引导步骤提示 -->
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="font-bold text-blue-900 text-sm flex items-center gap-2">
                  <el-icon class="text-blue-600"><InfoFilled /></el-icon>
                  三步极速导入现成题库表格
                </div>
                <div class="text-xs text-blue-700 leading-relaxed">
                  ① 下载标准 Excel 模板 ➜ ② 复制/填入已有题目（单选/多选/判断/填空/简答） ➜ ③ 上传秒级解析入库，<span class="font-bold underline">完全不消耗任何 AI 额度</span>！
                </div>
              </div>
              <el-button type="primary" class="font-bold shrink-0 shadow-sm" @click="downloadTemplate">
                <el-icon class="mr-1"><Download /></el-icon>
                下载标准导入模板 (.xlsx)
              </el-button>
            </div>

            <!-- 试卷基础设置 -->
            <el-form label-position="top" class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <el-form-item label="试卷名称 (选填，留空默认使用文件名)">
                  <el-input v-model="excelForm.title" placeholder="例如：2026年企业新员工入职考试题" />
                </el-form-item>

                <el-form-item label="考试限时 (分钟，0 表示不限时)">
                  <el-input-number v-model="excelForm.durationMinutes" :min="0" :max="300" class="w-full" />
                </el-form-item>
              </div>

              <el-form-item label="试卷说明 / 考生答题须知 (选填)">
                <el-input v-model="excelForm.description" placeholder="考生答题前可见的温馨提示" />
              </el-form-item>

              <el-form-item label="考生入场必填个人信息">
                <el-checkbox-group v-model="excelForm.requiredFields">
                  <el-checkbox label="name">姓名 (必填)</el-checkbox>
                  <el-checkbox label="student_id">学号 / 工号</el-checkbox>
                  <el-checkbox label="department">部门 / 班级</el-checkbox>
                  <el-checkbox label="phone">手机号码</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <!-- 上传控件 -->
              <el-form-item label="上传填写好的 Excel 题库文件 (.xlsx / .xls)" required>
                <el-upload
                  class="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition cursor-pointer"
                  drag
                  action=""
                  :auto-upload="false"
                  :limit="1"
                  :on-change="handleExcelFileChange"
                  :on-remove="handleExcelFileRemove"
                  accept=".xlsx,.xls"
                >
                  <el-icon class="text-4xl text-blue-500 mb-2"><UploadFilled /></el-icon>
                  <div class="text-sm font-medium text-gray-700">点击上传或将 Excel 表格拖拽至此处</div>
                  <div class="text-xs text-gray-400 mt-1">支持按照下载的标准模板格式填写的 .xlsx 或 .xls 文件</div>
                </el-upload>
              </el-form-item>

              <!-- 提交按钮 -->
              <div class="pt-4 border-t flex justify-end">
                <el-button
                  type="primary"
                  size="large"
                  :loading="loadingExcel"
                  @click="submitExcelImport"
                  class="px-8 font-bold"
                >
                  <el-icon class="mr-1"><DocumentChecked /></el-icon>
                  立即解析并导入试卷
                </el-button>
              </div>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 选项卡 2: Word / PDF / TXT 文档 AI 智能识别 -->
        <el-tab-pane label="🤖 文档 AI 智能识别排版 (Word/PDF/TXT/MD)" name="aiDoc">
          <div class="space-y-5 pt-2">
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="font-bold text-indigo-900 text-sm flex items-center gap-2">
                  <el-icon class="text-indigo-600"><MagicStick /></el-icon>
                  自由排版题库，大模型全自动识别
                </div>
                <div class="text-xs text-indigo-700 leading-relaxed">
                  原题库排版格式不拘一格？答案统一附在文档最后？AI 均可智能读懂题目、自动对应匹配答案并提取分值与解析。
                </div>
              </div>
            </div>

            <el-form label-position="top" class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <el-form-item label="试卷名称 (选填，留空默认使用文档名)">
                  <el-input v-model="aiDocForm.title" placeholder="例如：综合考核题库文档" />
                </el-form-item>

                <el-form-item label="考试限时 (分钟，0 表示不限时)">
                  <el-input-number v-model="aiDocForm.durationMinutes" :min="0" :max="300" class="w-full" />
                </el-form-item>
              </div>

              <el-form-item label="考生入场必填个人信息">
                <el-checkbox-group v-model="aiDocForm.requiredFields">
                  <el-checkbox label="name">姓名 (必填)</el-checkbox>
                  <el-checkbox label="student_id">学号 / 工号</el-checkbox>
                  <el-checkbox label="department">部门 / 班级</el-checkbox>
                  <el-checkbox label="phone">手机号码</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <!-- 上传控件 -->
              <el-form-item label="上传既有题库文档 (支持 Word .docx, .doc, PDF, TXT, MD)" required>
                <el-upload
                  class="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-500 transition cursor-pointer"
                  drag
                  action=""
                  :auto-upload="false"
                  :limit="1"
                  :on-change="handleAiFileChange"
                  :on-remove="handleAiFileRemove"
                  accept=".docx,.doc,.pdf,.txt,.md"
                >
                  <el-icon class="text-4xl text-indigo-500 mb-2"><Files /></el-icon>
                  <div class="text-sm font-medium text-gray-700">点击上传或将文档拖拽至此处</div>
                  <div class="text-xs text-gray-400 mt-1">支持 .docx、.doc、.pdf、.txt、.md 格式，AI 将深度解析文档结构</div>
                </el-upload>
              </el-form-item>

              <!-- 提交按钮 -->
              <div class="pt-4 border-t flex justify-end">
                <el-button
                  type="primary"
                  size="large"
                  :loading="loadingAi"
                  @click="submitAiDocImport"
                  class="px-8 font-bold bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                >
                  <el-icon class="mr-1"><MagicStick /></el-icon>
                  召唤 AI 智能提取题库
                </el-button>
              </div>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 导入成功弹窗引导 -->
    <el-dialog v-model="showSuccessDialog" title="🎉 题库导入成功并已生成答题二维码！" width="540px" center>
      <div class="text-center py-2 space-y-3">
        <h3 class="font-bold text-lg text-gray-800">{{ importedExam?.title }}</h3>
        <p class="text-xs text-gray-500">
          已成功收录 <span class="font-bold text-blue-600">{{ importedExam?.questions?.length || importedCount }}</span> 道试题，满分 <span class="font-bold text-green-600">{{ importedExam?.totalScore }}</span> 分
        </p>

        <!-- 专属二维码展示卡片 -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-sm mx-auto flex flex-col items-center shadow-inner space-y-3">
          <div class="bg-white p-3 rounded-xl border shadow-sm" id="import-bank-qr-box">
            <qrcode-vue :value="getScanUrl(importedQr?.codeKey)" :size="160" level="H" />
          </div>
          <div class="text-xs text-slate-500 font-medium">微信或手机扫码即刻答题</div>

          <!-- 链接与复制 -->
          <div class="w-full flex items-center gap-2">
            <el-input :model-value="getScanUrl(importedQr?.codeKey)" readonly size="small" />
            <el-button size="small" type="primary" plain @click="copyScanUrl(importedQr?.codeKey)">
              复制链接
            </el-button>
          </div>

          <!-- 模拟体验与下载 -->
          <div class="flex items-center gap-2 w-full">
            <el-button size="small" type="success" plain class="flex-1" @click="openH5Preview(importedQr?.codeKey)">
              <el-icon class="mr-1"><View /></el-icon>
              模拟手机答题
            </el-button>
            <el-button size="small" type="primary" plain class="flex-1" @click="downloadQrCode('import-bank-qr-box', importedExam?.title)">
              <el-icon class="mr-1"><Download /></el-icon>
              保存二维码图片
            </el-button>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-center gap-3 pt-2 border-t">
          <el-button type="primary" plain @click="gotoEdit">
            <el-icon class="mr-1"><Edit /></el-icon>
            进入在线核对/二次编辑
          </el-button>
          <el-button @click="gotoList">
            查看我的试卷库
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import QrcodeVue from 'qrcode.vue';
import api from '../../utils/api';

const router = useRouter();

const activeTab = ref('excel');
const loadingExcel = ref(false);
const loadingAi = ref(false);

const excelFile = ref(null);
const aiFile = ref(null);

const showSuccessDialog = ref(false);
const importedExam = ref(null);
const importedCount = ref(0);
const importedQr = ref(null);

const excelForm = reactive({
  title: '',
  description: '',
  durationMinutes: 0,
  requiredFields: ['name', 'student_id']
});

const aiDocForm = reactive({
  title: '',
  durationMinutes: 0,
  requiredFields: ['name', 'student_id']
});

// 获取扫码链接
const getScanUrl = (codeKey) => {
  if (!codeKey) return '';
  return `${window.location.origin}/exam/${codeKey}`;
};

// 复制链接
const copyScanUrl = (codeKey) => {
  if (!codeKey) return;
  navigator.clipboard.writeText(getScanUrl(codeKey));
  ElMessage.success('答题链接已复制到剪贴板！');
};

// 模拟打开答题
const openH5Preview = (codeKey) => {
  if (!codeKey) return;
  window.open(getScanUrl(codeKey), '_blank');
};

// 下载二维码图片
const downloadQrCode = (elementId, title) => {
  const container = document.getElementById(elementId);
  const canvas = container?.querySelector('canvas');
  if (!canvas) return ElMessage.warning('未能获取二维码画布');
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || '考试'}_二维码.png`;
  a.click();
  ElMessage.success('二维码图片已下载！');
};

// 下载标准 Excel 模板
const downloadTemplate = () => {
  const downloadUrl = '/api/import/template';
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', 'exam_import_template.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  ElMessage.success('正在下载标准 Excel 导入模板...');
};

// Excel 文件选择
const handleExcelFileChange = (file) => {
  excelFile.value = file.raw;
  if (!excelForm.title && file.name) {
    excelForm.title = file.name.replace(/\.[^/.]+$/, '');
  }
};

const handleExcelFileRemove = () => {
  excelFile.value = null;
};

// 提交 Excel 解析
const submitExcelImport = async () => {
  if (!excelFile.value) {
    return ElMessage.warning('请先选择需要上传的 Excel 题库表格！');
  }

  loadingExcel.value = true;
  try {
    const formData = new FormData();
    formData.append('file', excelFile.value);
    if (excelForm.title) formData.append('title', excelForm.title);
    if (excelForm.description) formData.append('description', excelForm.description);
    formData.append('durationMinutes', excelForm.durationMinutes);
    formData.append('requiredFields', JSON.stringify(excelForm.requiredFields));

    const res = await api.post('/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (res.data.success) {
      importedExam.value = res.data.data;
      importedCount.value = res.data.count;
      importedQr.value = res.data.qrCode;
      showSuccessDialog.value = true;
      ElMessage.success(`导入成功，已自动为您生成考试专属二维码！`);
    } else {
      ElMessage.error(res.data.message || '导入失败');
    }
  } catch (err) {
    console.error('Excel 导入错误:', err);
    ElMessage.error(err.response?.data?.message || err.message || 'Excel 导入失败');
  } finally {
    loadingExcel.value = false;
  }
};

// AI 文档选择
const handleAiFileChange = (file) => {
  aiFile.value = file.raw;
  if (!aiDocForm.title && file.name) {
    aiDocForm.title = file.name.replace(/\.[^/.]+$/, '');
  }
};

const handleAiFileRemove = () => {
  aiFile.value = null;
};

// 提交 AI 文档识别
const submitAiDocImport = async () => {
  if (!aiFile.value) {
    return ElMessage.warning('请先选择需要上传的题库文档！');
  }

  loadingAi.value = true;
  try {
    const formData = new FormData();
    formData.append('file', aiFile.value);
    if (aiDocForm.title) formData.append('title', aiDocForm.title);
    formData.append('durationMinutes', aiDocForm.durationMinutes);
    formData.append('requiredFields', JSON.stringify(aiDocForm.requiredFields));

    const res = await api.post('/import/ai-parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (res.data.success) {
      importedExam.value = res.data.data;
      importedCount.value = res.data.count;
      importedQr.value = res.data.qrCode;
      showSuccessDialog.value = true;
      ElMessage.success(`AI 识别成功，已自动为您生成考试专属二维码！`);
    } else {
      ElMessage.error(res.data.message || 'AI 识别失败');
    }
  } catch (err) {
    console.error('AI 识别错误:', err);
    ElMessage.error(err.response?.data?.message || err.message || 'AI 识别失败');
  } finally {
    loadingAi.value = false;
  }
};

// 路由跳转方法
const gotoEdit = () => {
  if (importedExam.value) {
    router.push(`/admin/exam-editor/${importedExam.value.id}`);
  }
};

const gotoList = () => {
  router.push('/admin/exams');
};
</script>

<style scoped>
.import-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 600;
  padding: 0 20px;
}
</style>
