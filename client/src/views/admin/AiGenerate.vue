<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <el-card class="shadow-sm border-0 rounded-xl">
      <template #header>
        <div class="flex items-center gap-2 font-bold text-gray-800 text-base">
          <el-icon class="text-blue-600"><MagicStick /></el-icon>
          AI 智能生成试卷与出题参数配置
        </div>
      </template>

      <el-form :model="form" label-position="top" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <el-form-item label="试卷名称 / 主题学科" required>
            <el-input v-model="form.title" placeholder="例如：2026年安全生产考核卷 或 Python基础语法测试" />
          </el-form-item>

          <el-form-item label="知识点 / 考核重点">
            <el-input v-model="form.topic" placeholder="例如：控制语句、异常处理、消防安全常识" />
          </el-form-item>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <el-form-item label="题目数量">
            <el-input-number v-model="form.totalQuestions" :min="1" :max="50" class="w-full" />
          </el-form-item>

          <el-form-item label="试卷总分值">
            <el-input-number v-model="form.totalScore" :min="10" :max="500" :step="10" class="w-full" />
          </el-form-item>

          <el-form-item label="难度等级">
            <el-select v-model="form.difficulty" class="w-full">
              <el-option label="简单 (Easy)" value="easy" />
              <el-option label="中等 (Medium)" value="medium" />
              <el-option label="困难 (Hard)" value="hard" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="包含题型组合 (多选)" required>
          <el-checkbox-group v-model="form.questionTypes">
            <el-checkbox label="single_choice">单选题</el-checkbox>
            <el-checkbox label="multi_choice">多选题</el-checkbox>
            <el-checkbox label="true_false">判断题</el-checkbox>
            <el-checkbox label="fill_blank">填空题</el-checkbox>
            <el-checkbox label="short_answer">简答题</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="考生入场必填个人信息配置">
          <el-checkbox-group v-model="form.requiredFields">
            <el-checkbox label="name">姓名 (必选)</el-checkbox>
            <el-checkbox label="student_id">学号 / 工号</el-checkbox>
            <el-checkbox label="department">部门 / 班级</el-checkbox>
            <el-checkbox label="phone">手机号码</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="出题参考资料上传 (支持 .pdf, .docx, .txt, .md)">
          <el-upload
            class="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition"
            action=""
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            accept=".pdf,.docx,.doc,.txt,.md"
          >
            <el-icon class="text-3xl text-gray-400 mb-2"><UploadFilled /></el-icon>
            <div class="text-sm text-gray-600">点击或将知识库/参考文件拖拽至此处</div>
            <div class="text-xs text-gray-400 mt-1">AI 将深入理解文档内容并精准提取考点出题</div>
          </el-upload>
        </el-form-item>

        <!-- 考试防作弊与规则设置 -->
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div class="font-bold text-sm text-gray-800 flex items-center gap-1.5">
            <el-icon class="text-blue-600"><Lock /></el-icon>
            🛡️ 考试规则与防作弊管控参数
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center justify-between bg-white p-3 rounded-lg border">
              <div>
                <div class="text-xs font-bold text-gray-800">防切屏作弊监控</div>
                <div class="text-[11px] text-gray-400">检测考生离开考场/切屏，达到上限强制交卷</div>
              </div>
              <el-switch v-model="form.preventCheating" />
            </div>

            <div v-if="form.preventCheating" class="flex items-center justify-between bg-white p-3 rounded-lg border">
              <div>
                <div class="text-xs font-bold text-gray-800">切屏容忍次数上限</div>
                <div class="text-[11px] text-gray-400">达到该次数即刻自动强制交卷</div>
              </div>
              <el-input-number v-model="form.maxSwitchCount" :min="1" :max="10" size="small" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div class="flex items-center justify-between bg-white p-3 rounded-lg border">
              <div>
                <div class="text-xs font-bold text-gray-800">单人允许答题次数</div>
                <div class="text-[11px] text-gray-400">限制每位考生身份的可作答次数</div>
              </div>
              <el-select v-model="form.maxSubmissions" size="small" class="w-36">
                <el-option label="限答 1 次 (严格模式)" :value="1" />
                <el-option label="限答 2 次 (允许补考)" :value="2" />
                <el-option label="限答 3 次" :value="3" />
                <el-option label="不限次数 (自由练习)" :value="0" />
              </el-select>
            </div>

            <div class="flex items-center justify-between bg-white p-3 rounded-lg border">
              <div>
                <div class="text-xs font-bold text-gray-800">交卷即时显示答案与解析</div>
                <div class="text-[11px] text-gray-400">开启后考生交卷可查看详细对错与考点</div>
              </div>
              <el-switch v-model="form.showAnswers" />
            </div>
          </div>
        </div>

        <div class="pt-4 border-t flex justify-end gap-3">
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="submitGenerate"
            class="px-8 font-bold"
          >
            <el-icon class="mr-1"><MagicStick /></el-icon>
            立即召唤 AI 出题并进入核对编辑
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 生成成功提示弹窗 -->
    <el-dialog v-model="showSuccessDialog" title="🎉 试卷生成成功并已生成答题二维码！" width="540px" center>
      <div class="text-center py-2 space-y-3">
        <h3 class="font-bold text-lg text-gray-800">{{ generatedExam?.title }}</h3>
        <p class="text-xs text-gray-500">
          已自动生成 <span class="font-bold text-blue-600">{{ generatedExam?.questions?.length || 0 }}</span> 道试题，总分 <span class="font-bold text-green-600">{{ generatedExam?.totalScore }}</span> 分
        </p>

        <!-- 专属二维码展示卡片 -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-sm mx-auto flex flex-col items-center shadow-inner space-y-3">
          <div class="bg-white p-3 rounded-xl border shadow-sm" id="ai-generate-qr-box">
            <qrcode-vue :value="getScanUrl(generatedQr?.codeKey)" :size="160" level="H" />
          </div>
          <div class="text-xs text-slate-500 font-medium">微信或手机扫码即刻答题</div>

          <!-- 链接与复制 -->
          <div class="w-full flex items-center gap-2">
            <el-input :model-value="getScanUrl(generatedQr?.codeKey)" readonly size="small" />
            <el-button size="small" type="primary" plain @click="copyScanUrl(generatedQr?.codeKey)">
              复制链接
            </el-button>
          </div>

          <!-- 模拟体验与下载 -->
          <div class="flex items-center gap-2 w-full">
            <el-button size="small" type="success" plain class="flex-1" @click="openH5Preview(generatedQr?.codeKey)">
              <el-icon class="mr-1"><View /></el-icon>
              模拟手机答题
            </el-button>
            <el-button size="small" type="primary" plain class="flex-1" @click="downloadQrCode('ai-generate-qr-box', generatedExam?.title)">
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
            进入在线二次编辑
          </el-button>
          <el-button @click="$router.push('/admin/exams')">
            查看全部试卷
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
import { downloadQrCodeFromContainer } from '../../utils/downloadHelper';

const router = useRouter();
const loading = ref(false);
const showSuccessDialog = ref(false);
const generatedExam = ref(null);
const generatedQr = ref(null);
const referenceFile = ref(null);

const form = reactive({
  title: '',
  topic: '',
  totalQuestions: 10,
  totalScore: 100,
  difficulty: 'medium',
  questionTypes: ['single_choice', 'multi_choice', 'true_false', 'fill_blank'],
  requiredFields: ['name', 'student_id'],
  preventCheating: true,
  maxSwitchCount: 3,
  maxSubmissions: 1,
  showAnswers: true
});

const getScanUrl = (codeKey) => {
  if (!codeKey) return '';
  return `${window.location.origin}/exam/${codeKey}`;
};

const copyScanUrl = (codeKey) => {
  if (!codeKey) return;
  navigator.clipboard.writeText(getScanUrl(codeKey));
  ElMessage.success('答题链接已复制到剪贴板！');
};

const openH5Preview = (codeKey) => {
  if (!codeKey) return;
  window.open(getScanUrl(codeKey), '_blank');
};

const downloadQrCode = (elementId, title) => {
  const success = downloadQrCodeFromContainer(elementId, `${title || '考试'}_二维码.png`, title);
  if (success) {
    ElMessage.success('二维码图片已成功下载！');
  } else {
    ElMessage.warning('未能获取二维码画布，请稍候重试');
  }
};

const handleFileChange = (file) => {
  referenceFile.value = file.raw;
};

const handleFileRemove = () => {
  referenceFile.value = null;
};

const submitGenerate = async () => {
  if (form.questionTypes.length === 0) {
    return ElMessage.warning('请至少选择一种试卷题型！');
  }

  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('topic', form.topic);
    formData.append('totalQuestions', form.totalQuestions);
    formData.append('totalScore', form.totalScore);
    formData.append('difficulty', form.difficulty);
    formData.append('questionTypes', JSON.stringify(form.questionTypes));
    formData.append('requiredFields', JSON.stringify(form.requiredFields));
    formData.append('examRules', JSON.stringify({
      preventCheating: form.preventCheating,
      maxSwitchCount: form.maxSwitchCount,
      maxSubmissions: form.maxSubmissions,
      showAnswers: form.showAnswers,
      idleTimeoutSeconds: 60
    }));

    if (referenceFile.value) {
      formData.append('referenceFile', referenceFile.value);
    }

    const res = await api.post('/exams/generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (res.data.success) {
      ElMessage.success('🎉 AI 出题完成！已为您自动进入题目核对与编辑页面，请确认无误后生成海报二维码');
      router.push(`/admin/exam-editor/${res.data.data.id}?source=ai`);
    } else {
      ElMessage.error(res.data.message || '生成失败');
    }
  } catch (error) {
    console.error('生成异常:', error);
    ElMessage.error(error.response?.data?.message || error.message || 'AI 出题异常');
  } finally {
    loading.value = false;
  }
};

const gotoEdit = () => {
  if (generatedExam.value) {
    router.push(`/admin/exam-editor/${generatedExam.value.id}`);
  }
};
</script>
