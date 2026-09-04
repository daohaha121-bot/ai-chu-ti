<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-between" v-loading="loading">
    <!-- 顶部状态栏与倒计时 Header -->
    <header v-if="examStarted && exam" class="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex items-center justify-between">
      <div>
        <h1 class="font-bold text-gray-900 text-sm truncate max-w-[200px]">{{ exam.title }}</h1>
        <p class="text-xs text-gray-400">已答 {{ answeredCount }} / {{ exam.questions.length }} 题</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- 倒计时 -->
        <div v-if="exam.durationMinutes > 0" class="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
          <el-icon><Timer /></el-icon>
          {{ formatCountdown(remainingSeconds) }}
        </div>

        <el-button type="primary" size="small" class="font-bold" @click="confirmSubmit">交卷</el-button>
      </div>
    </header>

    <!-- 1. 入场考生个人信息填写 -->
    <main v-if="!examStarted && exam" class="flex-1 max-w-md mx-auto w-full p-6 flex flex-col justify-center">
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-5">
        <div class="text-center space-y-1">
          <span class="inline-block p-3 rounded-full bg-blue-50 text-blue-600 text-2xl font-bold mb-1">📝</span>
          <h2 class="text-xl font-bold text-gray-900">{{ exam.title }}</h2>
          <p class="text-xs text-gray-500">{{ exam.description || '请填写考生入场信息开始答题' }}</p>
        </div>

        <div class="bg-gray-50 p-3 rounded-xl text-xs space-y-1.5 text-gray-600">
          <div class="flex justify-between"><span>试卷总分:</span><span class="font-bold text-gray-900">{{ exam.totalScore }} 分</span></div>
          <div class="flex justify-between"><span>合格分数线:</span><span class="font-bold text-green-600">{{ exam.passScore }} 分</span></div>
          <div class="flex justify-between"><span>考试限时:</span><span class="font-bold text-blue-600">{{ exam.durationMinutes > 0 ? exam.durationMinutes + ' 分钟' : '不限时' }}</span></div>
          <div v-if="exam.examRules?.preventCheating" class="flex justify-between text-red-500 font-semibold"><span>防作弊警告:</span><span>切屏将被系统监控</span></div>
        </div>

        <el-form :model="userInfoForm" label-position="top" class="space-y-3">
          <el-form-item v-if="requiredFields.includes('name')" label="考生姓名" required>
            <el-input v-model="userInfoForm.name" placeholder="请输入您的真实姓名" size="large" />
          </el-form-item>

          <el-form-item v-if="requiredFields.includes('student_id')" label="学号 / 工号" required>
            <el-input v-model="userInfoForm.student_id" placeholder="请输入您的学号或工号" size="large" />
          </el-form-item>

          <el-form-item v-if="requiredFields.includes('department')" label="部门 / 班级">
            <el-input v-model="userInfoForm.department" placeholder="例如：软件工程1班" size="large" />
          </el-form-item>

          <el-button type="primary" size="large" class="w-full font-bold text-base mt-2" @click="startExam">
            开始进入答题
          </el-button>
        </el-form>
      </div>
    </main>

    <!-- 2. H5 移动端题目渲染界面 -->
    <main v-if="examStarted && exam" class="flex-1 max-w-2xl mx-auto w-full p-4 space-y-6">
      <div v-for="(q, idx) in exam.questions" :key="q.id" class="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <!-- 题目序号与分值 -->
        <div class="flex items-center justify-between text-xs border-b pb-2">
          <span class="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            第 {{ idx + 1 }} 题 / {{ getTypeName(q.type) }}
          </span>
          <span class="font-semibold text-gray-500">本题 {{ q.score }} 分</span>
        </div>

        <!-- 题干 -->
        <div class="text-base font-bold text-gray-900 leading-relaxed">
          {{ q.stem }}
        </div>

        <!-- 选项: 单选题 -->
        <div v-if="q.type === 'single_choice'" class="space-y-2">
          <div
            v-for="(opt, oIdx) in q.options"
            :key="oIdx"
            class="p-3 rounded-xl border text-sm flex items-center gap-3 cursor-pointer transition"
            :class="userAnswers[q.id] === opt ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-bold' : 'border-gray-200 hover:bg-gray-50'"
            @click="userAnswers[q.id] = opt; resetIdleTimer()"
          >
            <div class="w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0" :class="userAnswers[q.id] === opt ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 border-gray-300'">
              {{ String.fromCharCode(65 + oIdx) }}
            </div>
            <span>{{ opt }}</span>
          </div>
        </div>

        <!-- 选项: 多选题 -->
        <div v-else-if="q.type === 'multi_choice'" class="space-y-2">
          <el-checkbox-group v-model="userAnswers[q.id]" class="flex flex-col space-y-2 w-full">
            <div
              v-for="(opt, oIdx) in q.options"
              :key="oIdx"
              class="p-3 rounded-xl border text-sm flex items-center gap-3 cursor-pointer transition w-full"
              :class="userAnswers[q.id]?.includes(opt) ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-bold' : 'border-gray-200'"
              @click="toggleMultiChoice(q.id, opt)"
            >
              <el-checkbox :label="opt" size="large" class="!mr-0">
                <span class="font-bold text-gray-700 mr-2">{{ String.fromCharCode(65 + oIdx) }}.</span>
                <span>{{ opt }}</span>
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </div>

        <!-- 判断题 -->
        <div v-else-if="q.type === 'true_false'" class="grid grid-cols-2 gap-3">
          <button
            class="py-3 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2"
            :class="userAnswers[q.id] === '正确' ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200'"
            @click="userAnswers[q.id] = '正确'; resetIdleTimer()"
          >
            ✓ 正确
          </button>
          <button
            class="py-3 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2"
            :class="userAnswers[q.id] === '错误' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200'"
            @click="userAnswers[q.id] = '错误'; resetIdleTimer()"
          >
            ✕ 错误
          </button>
        </div>

        <!-- 填空题 & 简答题 -->
        <div v-else-if="['fill_blank', 'short_answer'].includes(q.type)">
          <el-input
            v-model="userAnswers[q.id]"
            :type="q.type === 'short_answer' ? 'textarea' : 'text'"
            :rows="q.type === 'short_answer' ? 4 : 1"
            placeholder="请在此输入您的解答答案..."
            @input="resetIdleTimer"
          />
        </div>
      </div>
    </main>

    <!-- 切屏警告弹窗 -->
    <el-dialog v-model="showCheatingWarning" title="⚠️ 切屏监控警告" width="90%" center :show-close="false">
      <div class="text-center py-2 space-y-2">
        <p class="text-red-600 font-bold text-base">检测到您离开了考试页面！</p>
        <p class="text-xs text-gray-500">系统已记录您的切屏次数（当前切屏: {{ switchCount }} 次）。频繁切屏将被强制交卷！</p>
      </div>
      <template #footer>
        <el-button type="primary" class="w-full font-bold" @click="showCheatingWarning = false">我已知晓，继续答题</el-button>
      </template>
    </el-dialog>

    <!-- 无操作检测超时提醒弹窗 -->
    <el-dialog v-model="showIdleWarning" title="⏱️ 无操作提醒" width="90%" center :show-close="false">
      <div class="text-center py-2 space-y-2">
        <p class="text-amber-600 font-bold text-base">您已长时间没有进行答题操作！</p>
        <p class="text-xs text-gray-500">为防止替考，若 {{ idleCountdown }} 秒内无响应将自动提交试卷。</p>
      </div>
      <template #footer>
        <el-button type="primary" class="w-full font-bold" @click="resetIdleTimer">恢复答题状态</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const exam = ref(null);
const examStarted = ref(false);

const userInfoForm = reactive({ name: '', student_id: '', department: '' });
const requiredFields = ref(['name']);
const userAnswers = reactive({});

// 倒计时与防作弊监控
const remainingSeconds = ref(0);
let timerInterval = null;
const switchCount = ref(0);
const showCheatingWarning = ref(false);

// 无操作检测
const showIdleWarning = ref(false);
const idleCountdown = ref(10);
let idleTimer = null;
let idleCountdownInterval = null;

const answeredCount = computed(() => {
  return Object.values(userAnswers).filter(val => {
    if (Array.isArray(val)) return val.length > 0;
    return val !== undefined && val !== null && String(val).trim() !== '';
  }).length;
});

const getTypeName = (type) => {
  const map = {
    single_choice: '单选题',
    multi_choice: '多选题',
    true_false: '判断题',
    fill_blank: '填空题',
    short_answer: '简答题'
  };
  return map[type] || '题目';
};

const formatCountdown = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const fetchExamData = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`/api/qr/redirect/${route.params.codeKey}`);
    if (res.data.success) {
      exam.value = res.data.data.exam;
      requiredFields.value = exam.value.requiredFields || ['name'];

      // 初始化多选题答案数组
      exam.value.questions.forEach(q => {
        if (q.type === 'multi_choice') userAnswers[q.id] = [];
      });
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '加载试卷失败');
  } finally {
    loading.value = false;
  }
};

const startExam = () => {
  if (requiredFields.value.includes('name') && !userInfoForm.name) {
    return ElMessage.warning('请先填写您的姓名！');
  }
  if (requiredFields.value.includes('student_id') && !userInfoForm.student_id) {
    return ElMessage.warning('请先填写您的学号/工号！');
  }

  examStarted.value = true;

  // 开启倒计时
  if (exam.value.durationMinutes > 0) {
    remainingSeconds.value = exam.value.durationMinutes * 60;
    timerInterval = setInterval(() => {
      remainingSeconds.value--;
      if (remainingSeconds.value <= 0) {
        clearInterval(timerInterval);
        ElMessage.warning('考试时间截止，正在自动交卷...');
        submitExam();
      }
    }, 1000);
  }

  // 绑定切屏防作弊与无操作监控
  bindAntiCheating();
  resetIdleTimer();
};

const toggleMultiChoice = (qId, option) => {
  if (!userAnswers[qId]) userAnswers[qId] = [];
  const idx = userAnswers[qId].indexOf(option);
  if (idx > -1) userAnswers[qId].splice(idx, 1);
  else userAnswers[qId].push(option);
  resetIdleTimer();
};

// 页面可见性切屏监听
const handleVisibilityChange = () => {
  if (document.hidden && examStarted.value && exam.value?.examRules?.preventCheating) {
    switchCount.value++;
    showCheatingWarning.value = true;
    if (switchCount.value >= 3) {
      ElMessage.error('频繁切屏超过上限，系统强制交卷！');
      submitExam();
    }
  }
};

const bindAntiCheating = () => {
  document.addEventListener('visibilitychange', handleVisibilityChange);
};

// 重置无操作倒计时
const resetIdleTimer = () => {
  showIdleWarning.value = false;
  clearInterval(idleCountdownInterval);
  clearTimeout(idleTimer);

  const idleSeconds = exam.value?.examRules?.idleTimeoutSeconds || 60;
  idleTimer = setTimeout(() => {
    if (!examStarted.value) return;
    showIdleWarning.value = true;
    idleCountdown.value = 10;
    idleCountdownInterval = setInterval(() => {
      idleCountdown.value--;
      if (idleCountdown.value <= 0) {
        clearInterval(idleCountdownInterval);
        submitExam();
      }
    }, 1000);
  }, idleSeconds * 1000);
};

const confirmSubmit = async () => {
  try {
    await ElMessageBox.confirm('确定要提交试卷吗？交卷后不可修改。', '交卷确认', {
      confirmButtonText: '确定交卷',
      cancelButtonText: '继续答题',
      type: 'primary'
    });
    submitExam();
  } catch (err) {}
};

const submitExam = async () => {
  clearInterval(timerInterval);
  clearTimeout(idleTimer);
  clearInterval(idleCountdownInterval);
  document.removeEventListener('visibilitychange', handleVisibilityChange);

  try {
    loading.value = true;
    const payload = {
      examId: exam.value.id,
      userInfo: userInfoForm,
      answers: userAnswers,
      switchCount: switchCount.value
    };

    const res = await axios.post('/api/submissions', payload);
    if (res.data.success) {
      ElMessage.success('提交成功！');
      router.push({
        name: 'ExamResult',
        query: { resultData: JSON.stringify(res.data.data) }
      });
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '交卷失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchExamData);

onUnmounted(() => {
  clearInterval(timerInterval);
  clearTimeout(idleTimer);
  clearInterval(idleCountdownInterval);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>
