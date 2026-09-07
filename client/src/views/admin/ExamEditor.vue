<template>
  <div class="max-w-5xl mx-auto space-y-6" v-loading="loading">
    <!-- 新出题/导入引导横幅 -->
    <div v-if="$route.query.source" class="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-2xl">✨</span>
        <div>
          <div class="font-bold text-sm">出题已完成！请在下方核对与在线微调试卷内容</div>
          <div class="text-xs text-blue-100 mt-0.5">您可以增删修改题干、选项、正确答案或单题分值，确认无误后点击右上角「🖼️ 生成考试海报二维码」</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <el-button type="warning" class="font-bold shadow" @click="openPosterModal">
          <el-icon class="mr-1"><Picture /></el-icon>
          一键获取考试二维码与海报
        </el-button>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <el-button @click="$router.push('/admin/exams')">← 返回试卷库</el-button>
        <h3 class="text-lg font-bold text-gray-900">试卷二次编辑器 & 考试防作弊规则配置</h3>
      </div>
      <div class="flex items-center gap-2.5 flex-wrap">
        <el-button type="success" plain size="large" @click="downloadPureQrDirect">
          <el-icon class="mr-1"><Download /></el-icon>
          下载纯二维码
        </el-button>
        <el-button type="warning" plain size="large" @click="openPosterModal">
          <el-icon class="mr-1"><Picture /></el-icon>
          海报二维码
        </el-button>
        <el-button type="info" plain size="large" @click="showAnswersModal = true">
          <el-icon class="mr-1"><CopyDocument /></el-icon>
          复制正确答案
        </el-button>
        <el-button type="primary" size="large" @click="saveExam">
          <el-icon class="mr-1"><Check /></el-icon>
          保存修改并更新试卷
        </el-button>
      </div>
    </div>

    <!-- 试卷专属答题二维码与即时分发卡片 (直接在页面显示，可扫码、可一键下载) -->
    <div class="bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 rounded-2xl border border-blue-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-5">
        <!-- 核心二维码直接渲染 -->
        <div id="inline-editor-qr-box" class="p-3 bg-white rounded-2xl shadow-sm border border-blue-100 shrink-0 flex flex-col items-center">
          <qrcode-vue
            v-if="currentQrCodeKey"
            :value="getScanUrl(currentQrCodeKey)"
            :size="130"
            level="H"
            class="rounded-lg"
          />
          <div v-else class="w-[130px] h-[130px] flex items-center justify-center text-xs text-gray-400">
            正在加载二维码...
          </div>
          <span class="text-[10px] text-gray-400 mt-1 font-mono">手机扫码即刻答题</span>
        </div>

        <!-- 活码信息与操作引导 -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
              ● 考试动态活码已就绪 (随时可测)
            </span>
            <span class="text-xs text-gray-400 font-mono">活码ID: {{ currentQrCodeKey || '-' }}</span>
          </div>
          <h4 class="text-base font-black text-gray-900 leading-tight">
            {{ exam.title || '当前考试' }}
          </h4>
          <p class="text-xs text-gray-500 max-w-lg">
            本活码永久有效。试卷题目在此修改保存后，考生扫码将实时看到最新试题，无需重新打印更换二维码！
          </p>
          <div class="flex items-center gap-2 pt-1 flex-wrap">
            <el-input :model-value="getScanUrl(currentQrCodeKey)" readonly size="small" class="w-64" />
            <el-button size="small" type="primary" plain @click="copyScanUrl(currentQrCodeKey)">
              <el-icon class="mr-1"><CopyDocument /></el-icon>
              复制答题链接
            </el-button>
            <el-button size="small" type="info" plain @click="openH5Preview(currentQrCodeKey)">
              <el-icon class="mr-1"><View /></el-icon>
              模拟答题
            </el-button>
          </div>
        </div>
      </div>

      <!-- 核心一键下载按钮专区 -->
      <div class="flex flex-col gap-2.5 shrink-0 w-full md:w-auto">
        <el-button type="success" size="large" class="font-bold shadow" @click="downloadPureQrDirect">
          <el-icon class="mr-1"><Download /></el-icon>
          📥 一键下载纯二维码 (PNG)
        </el-button>
        <el-button type="warning" size="large" class="font-bold shadow" @click="openPosterModal">
          <el-icon class="mr-1"><Picture /></el-icon>
          🖼️ 生成 & 下载宣传海报
        </el-button>
      </div>
    </div>

    <!-- 试卷基本属性与考试防作弊规则 -->
    <el-card class="shadow-sm border-0 rounded-xl">
      <template #header>
        <div class="font-bold text-gray-800 flex items-center gap-2">
          <el-icon class="text-blue-600"><Setting /></el-icon>
          试卷基础属性与防作弊管控参数
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <el-form-item label="试卷名称">
          <el-input v-model="exam.title" />
        </el-form-item>

        <el-form-item label="试卷说明 / 答题须知">
          <el-input v-model="exam.description" placeholder="考生答题前可见的温馨提示" />
        </el-form-item>

        <el-form-item label="考试限时 (分钟，0 表示不限时)">
          <el-input-number v-model="exam.durationMinutes" :min="0" :max="300" class="w-full" />
        </el-form-item>

        <el-form-item label="合格分数线">
          <el-input-number v-model="exam.passScore" :min="0" :max="exam.totalScore" class="w-full" />
        </el-form-item>
      </div>

      <div class="pt-4 border-t mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-3">
          <h4 class="font-bold text-sm text-gray-700">🛡️ 考试与防作弊机制设置</h4>
          <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <span class="text-sm text-gray-700">防切屏监控（记录切屏并强制交卷）</span>
            <el-switch v-model="examRules.preventCheating" />
          </div>

          <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <span class="text-sm text-gray-700">交卷后即时显示成绩与标准答案解析</span>
            <el-switch v-model="examRules.showAnswers" />
          </div>
        </div>

        <div class="space-y-3">
          <h4 class="font-bold text-sm text-gray-700">⏱️ 无操作超时自动交卷机制</h4>
          <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <span class="text-sm text-gray-700">单人限制答题次数</span>
            <el-input-number v-model="examRules.maxSubmissions" :min="1" :max="10" size="small" />
          </div>

          <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <span class="text-sm text-gray-700">无操作弹窗提醒与超时秒数</span>
            <el-input-number v-model="examRules.idleTimeoutSeconds" :min="10" :max="600" size="small" />
          </div>
        </div>
      </div>
    </el-card>

    <!-- 题目可视化列表与修改 -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h4 class="font-bold text-base text-gray-800">题目列表 ({{ questions.length }} 题，满分 {{ computedTotalScore }} 分)</h4>
        <el-button type="success" plain @click="addQuestion">
          + 手动新增题目
        </el-button>
      </div>

      <div v-for="(q, index) in questions" :key="index" class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
              {{ index + 1 }}
            </span>
            <el-select v-model="q.type" size="small" class="w-32">
              <el-option label="单选题" value="single_choice" />
              <el-option label="多选题" value="multi_choice" />
              <el-option label="判断题" value="true_false" />
              <el-option label="填空题" value="fill_blank" />
              <el-option label="简答题" value="short_answer" />
            </el-select>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1">
              <span class="text-xs text-gray-500">分值:</span>
              <el-input-number v-model="q.score" :min="1" :max="100" size="small" class="w-24" />
            </div>
            <el-button size="small" type="danger" icon="Delete" circle @click="removeQuestion(index)" />
          </div>
        </div>

        <!-- 题干 -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1">题干内容:</label>
          <el-input type="textarea" :rows="2" v-model="q.stem" placeholder="请输入题目内容" />
        </div>

        <!-- 选项编辑（针对单选/多选） -->
        <div v-if="['single_choice', 'multi_choice'].includes(q.type)" class="space-y-2 pl-4 border-l-2 border-blue-200">
          <label class="block text-xs font-semibold text-gray-500">选项列表:</label>
          <div v-for="(opt, oIdx) in q.options" :key="oIdx" class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-400 w-6">{{ String.fromCharCode(65 + oIdx) }}.</span>
            <el-input v-model="q.options[oIdx]" size="small" placeholder="选项内容" />
            <el-button size="small" type="danger" icon="Close" circle plain @click="q.options.splice(oIdx, 1)" />
          </div>
          <el-button size="small" type="primary" plain @click="q.options.push('')">+ 添加选项</el-button>
        </div>

        <!-- 标准答案与解析 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">标准正确答案:</label>
            <el-input v-model="q.answer" placeholder="例如: A. 选项内容 或 正确/错误" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">考点解析说明:</label>
            <el-input v-model="q.analysis" placeholder="考点背景与详细解答步骤" />
          </div>
        </div>
      </div>
    </div>

    <!-- 考试专属宣传海报二维码弹窗 -->
    <ExamPosterModal
      v-model="showPosterModal"
      :exam="fullExamForModal"
      :qr-code="currentQrCode"
    />

    <!-- 一键复制正确答案弹窗 -->
    <CopyAnswersModal
      v-model="showAnswersModal"
      :exam="fullExamForModal"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import QrcodeVue from 'qrcode.vue';
import ExamPosterModal from '../../components/ExamPosterModal.vue';
import CopyAnswersModal from '../../components/CopyAnswersModal.vue';
import api from '../../utils/api';
import axios from 'axios';
import { downloadQrCodeFromContainer, getExamScanUrl } from '../../utils/downloadHelper';

const route = useRoute();
const router = useRouter();
const loading = ref(false);

const showPosterModal = ref(false);
const showAnswersModal = ref(false);
const currentQrCode = ref(null);

const currentQrCodeKey = computed(() => {
  return currentQrCode.value?.codeKey || (exam.qrCodes && exam.qrCodes[0]?.codeKey) || '';
});

const getScanUrl = (codeKey) => {
  return getExamScanUrl(codeKey);
};

const copyScanUrl = (codeKey) => {
  if (!codeKey) return;
  navigator.clipboard.writeText(getScanUrl(codeKey));
  ElMessage.success('考试答题链接已复制到剪贴板！');
};

const openH5Preview = (codeKey) => {
  if (!codeKey) return;
  window.open(getScanUrl(codeKey), '_blank');
};

const downloadPureQrDirect = () => {
  const success = downloadQrCodeFromContainer(
    'inline-editor-qr-box',
    `${exam.title || '考试'}_二维码.png`,
    exam.title
  );
  if (success) {
    ElMessage.success('考试二维码图片已一键保存至本地！');
  } else {
    ElMessage.warning('未能获取二维码画布，请稍候重试');
  }
};

const fullExamForModal = computed(() => ({
  ...exam,
  totalScore: computedTotalScore.value,
  questions: questions.value
}));

const openPosterModal = async () => {
  if (!exam.id) return;
  try {
    const res = await api.get(`/qr/by-exam/${exam.id}`);
    if (res.data.success && res.data.data) {
      currentQrCode.value = res.data.data;
    }
  } catch (err) {}
  showPosterModal.value = true;
};

const exam = reactive({
  id: '',
  title: '',
  description: '',
  durationMinutes: 0,
  passScore: 60,
  totalScore: 100
});

const examRules = reactive({
  maxSubmissions: 1,
  showAnswers: true,
  preventCheating: true,
  idleTimeoutSeconds: 60
});

const questions = ref([]);

const computedTotalScore = computed(() => {
  return questions.value.reduce((sum, q) => sum + (parseFloat(q.score) || 0), 0);
});

const fetchExamDetails = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`/api/exams/${route.params.id}`);
    if (res.data.success) {
      const data = res.data.data;
      exam.id = data.id;
      exam.title = data.title;
      exam.description = data.description || '';
      exam.durationMinutes = data.durationMinutes || 0;
      exam.passScore = data.passScore || 60;
      exam.totalScore = data.totalScore || 100;

      const rules = JSON.parse(data.examRules || '{}');
      Object.assign(examRules, rules);

      questions.value = (data.questions || []).map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : []
      }));

      // 加载活码
      if (data.qrCodes && data.qrCodes.length > 0) {
        currentQrCode.value = data.qrCodes[0];
      } else {
        try {
          const qrRes = await api.get(`/qr/by-exam/${data.id}`);
          if (qrRes.data.success && qrRes.data.data) {
            currentQrCode.value = qrRes.data.data;
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    ElMessage.error('获取试卷数据失败');
  } finally {
    loading.value = false;
  }
};

const addQuestion = () => {
  questions.value.push({
    type: 'single_choice',
    stem: '新题目',
    options: ['A. 选项1', 'B. 选项2', 'C. 选项3', 'D. 选项4'],
    answer: 'A. 选项1',
    score: 10,
    analysis: ''
  });
};

const removeQuestion = (index) => {
  questions.value.splice(index, 1);
};

const saveExam = async () => {
  try {
    const payload = {
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      passScore: exam.passScore,
      totalScore: computedTotalScore.value,
      examRules: JSON.stringify(examRules),
      questions: questions.value
    };

    const res = await axios.put(`/api/exams/${exam.id}`, payload);
    if (res.data.success) {
      ElMessage.success('试卷与防作弊规则保存成功！');
      router.push('/admin/exams');
    }
  } catch (err) {
    ElMessage.error('保存失败');
  }
};

onMounted(fetchExamDetails);
</script>
