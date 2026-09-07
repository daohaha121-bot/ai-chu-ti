<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-between" v-loading="loading">
    <!-- 顶部状态吸顶 Header (实时考试进度与倒计时) -->
    <header v-if="exam" class="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-2.5 shadow-sm flex items-center justify-between">
      <div class="flex items-center gap-2 overflow-hidden mr-2">
        <span class="text-lg">📝</span>
        <div class="truncate">
          <h1 class="font-bold text-gray-900 text-sm truncate max-w-[180px] sm:max-w-xs">{{ exam.title }}</h1>
          <p class="text-[11px] text-gray-400">已作答 <span class="font-bold text-blue-600">{{ answeredCount }}</span> / {{ exam.questions.length }} 题</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 shrink-0">
        <!-- 倒计时 (若有限时) -->
        <div v-if="exam.durationMinutes > 0" class="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold border border-red-100">
          <el-icon><Timer /></el-icon>
          <span>{{ formatCountdown(remainingSeconds) }}</span>
        </div>
        <div v-else class="text-[11px] text-gray-400 hidden sm:inline-block">
          ⏱️ 不限时
        </div>

        <el-button type="primary" size="small" class="font-bold shadow-sm" @click="handlePreSubmit">
          交卷
        </el-button>
      </div>
    </header>

    <!-- 加载失败/二维码异常兜底屏 -->
    <main v-if="loadError && !loading" class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-sm">
        ⚠️
      </div>
      <h3 class="text-base font-bold text-gray-900 mb-1">未能获取到试卷信息</h3>
      <p class="text-xs text-gray-500 max-w-xs mb-5">{{ loadErrorMessage || '该二维码可能已过期或系统正在更新' }}</p>
      <el-button type="primary" round @click="fetchExamData">重新加载</el-button>
    </main>

    <!-- 主答题内容区：扫码秒开全卷，零阻断直达考题 -->
    <main v-if="exam && !loadError" class="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4 pb-28">
      <!-- 1. 试卷卷头信息卡片 -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 space-y-3">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            <span>●</span> 手机在线考试 · 问卷星模式 <span>●</span>
          </div>
          <h2 class="text-xl font-black text-gray-900 tracking-tight leading-snug">{{ exam.title }}</h2>
          <p class="text-xs text-gray-500 leading-relaxed">{{ exam.description || '请仔细审题并如实作答，答题完毕后点击页面底部提交试卷。' }}</p>
        </div>

        <!-- 试卷核心参数 -->
        <div class="grid grid-cols-4 gap-2 pt-1 border-t border-gray-100 text-center">
          <div class="bg-gray-50/80 p-2 rounded-xl">
            <div class="text-[10px] text-gray-400">试卷总分</div>
            <div class="text-xs font-black text-gray-900 mt-0.5">{{ exam.totalScore }} 分</div>
          </div>
          <div class="bg-gray-50/80 p-2 rounded-xl">
            <div class="text-[10px] text-gray-400">及格线</div>
            <div class="text-xs font-black text-green-600 mt-0.5">{{ exam.passScore }} 分</div>
          </div>
          <div class="bg-gray-50/80 p-2 rounded-xl">
            <div class="text-[10px] text-gray-400">考试限时</div>
            <div class="text-xs font-black text-blue-600 mt-0.5">{{ exam.durationMinutes > 0 ? exam.durationMinutes + '分' : '不限时' }}</div>
          </div>
          <div class="bg-gray-50/80 p-2 rounded-xl">
            <div class="text-[10px] text-gray-400">题目总数</div>
            <div class="text-xs font-black text-purple-600 mt-0.5">{{ exam.questions.length }} 题</div>
          </div>
        </div>

        <div v-if="exam.examRules?.preventCheating" class="bg-amber-50 border border-amber-200/60 rounded-xl p-2.5 text-[11px] text-amber-800 flex items-center gap-1.5">
          <span>🛡️</span>
          <span><b>考试防作弊开启</b>：系统全程监控切屏，频繁切屏将触发强制交卷，请诚信作答！</span>
        </div>
      </div>

      <!-- 2. 卷头考生档案输入区 (紧凑嵌入试卷顶部，无需登录阻断，随时填写) -->
      <div
        id="candidate-info-section"
        class="bg-white p-5 rounded-2xl shadow-sm border transition-all duration-300"
        :class="nameHighlight ? 'border-red-400 ring-2 ring-red-100' : 'border-blue-100/80'"
      >
        <div class="flex items-center justify-between mb-3 border-b pb-2">
          <div class="flex items-center gap-1.5">
            <span class="text-base">📋</span>
            <span class="font-bold text-sm text-gray-800">考生基本信息登记</span>
          </div>
          <span class="text-[11px] text-gray-400">免注册 · 填姓名即可交卷出分</span>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">
              考生真实姓名 <span v-if="requiredFields.includes('name')" class="text-red-500">* (必填)</span>
            </label>
            <el-input
              ref="nameInputRef"
              v-model="userInfoForm.name"
              placeholder="请输入您的真实姓名（用于成绩归档）"
              size="large"
              clearable
              @input="nameHighlight = false"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-if="requiredFields.includes('student_id') || true">
              <label class="block font-semibold text-gray-600 mb-1">
                学号 / 工号 <span v-if="requiredFields.includes('student_id')" class="text-red-500">*</span>
              </label>
              <el-input
                v-model="userInfoForm.student_id"
                placeholder="请输入学号或工号（选填）"
                size="default"
                clearable
              />
            </div>

            <div v-if="requiredFields.includes('department') || true">
              <label class="block font-semibold text-gray-600 mb-1">
                班级 / 部门 / 班组
              </label>
              <el-input
                v-model="userInfoForm.department"
                placeholder="例如：施工一组 / 运维部（选填）"
                size="default"
                clearable
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 全部题目列表 (直接展现，扫码即览) -->
      <div
        v-for="(q, idx) in exam.questions"
        :key="q.id"
        :id="'question-item-' + q.id"
        class="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-3 transition-all"
      >
        <!-- 题目序号、题型与分值 -->
        <div class="flex items-center justify-between text-xs border-b border-gray-100 pb-2.5">
          <div class="flex items-center gap-1.5">
            <span class="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md text-xs">
              第 {{ idx + 1 }} 题
            </span>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold" :class="getTypeBadgeClass(q.type)">
              {{ getTypeName(q.type) }}
            </span>
          </div>
          <span class="font-bold text-gray-500">{{ q.score }} 分</span>
        </div>

        <!-- 题干 -->
        <div class="text-[15px] font-bold text-gray-900 leading-relaxed whitespace-pre-line">
          {{ q.stem }}
        </div>

        <!-- 选项: 单选题 -->
        <div v-if="q.type === 'single_choice'" class="space-y-2.5 pt-1">
          <div
            v-for="(opt, oIdx) in q.options"
            :key="oIdx"
            class="p-3.5 rounded-xl border text-sm flex items-start gap-3 cursor-pointer transition active:scale-[0.99]"
            :class="userAnswers[q.id] === opt
              ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold shadow-sm'
              : 'border-gray-200 bg-white hover:bg-gray-50/80 text-gray-700'"
            @click="userAnswers[q.id] = opt; resetIdleTimer()"
          >
            <div
              class="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition"
              :class="userAnswers[q.id] === opt ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-500 border-gray-300 bg-gray-50'"
            >
              {{ String.fromCharCode(65 + oIdx) }}
            </div>
            <span class="flex-1 leading-normal pt-0.5">{{ opt }}</span>
          </div>
        </div>

        <!-- 选项: 多选题 -->
        <div v-else-if="q.type === 'multi_choice'" class="space-y-2.5 pt-1">
          <div class="text-[11px] text-amber-600 font-semibold mb-1">（多选，请勾选所有正确选项）</div>
          <div
            v-for="(opt, oIdx) in q.options"
            :key="oIdx"
            class="p-3.5 rounded-xl border text-sm flex items-start gap-3 cursor-pointer transition active:scale-[0.99]"
            :class="userAnswers[q.id]?.includes(opt)
              ? 'border-purple-500 bg-purple-50/60 text-purple-900 font-bold shadow-sm'
              : 'border-gray-200 bg-white hover:bg-gray-50/80 text-gray-700'"
            @click="toggleMultiChoice(q.id, opt)"
          >
            <div
              class="w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition"
              :class="userAnswers[q.id]?.includes(opt) ? 'bg-purple-600 text-white border-purple-600' : 'text-gray-400 border-gray-300 bg-gray-50'"
            >
              <span v-if="userAnswers[q.id]?.includes(opt)">✓</span>
              <span v-else>{{ String.fromCharCode(65 + oIdx) }}</span>
            </div>
            <span class="flex-1 leading-normal pt-0.5">{{ opt }}</span>
          </div>
        </div>

        <!-- 判断题 -->
        <div v-else-if="q.type === 'true_false'" class="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            class="py-3.5 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 active:scale-95"
            :class="userAnswers[q.id] === '正确'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
            @click="userAnswers[q.id] = '正确'; resetIdleTimer()"
          >
            <span class="text-base">✓</span> 正确
          </button>
          <button
            type="button"
            class="py-3.5 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 active:scale-95"
            :class="userAnswers[q.id] === '错误'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
            @click="userAnswers[q.id] = '错误'; resetIdleTimer()"
          >
            <span class="text-base">✕</span> 错误
          </button>
        </div>

        <!-- 填空题 & 简答题 -->
        <div v-else-if="['fill_blank', 'short_answer'].includes(q.type)" class="pt-1">
          <el-input
            v-model="userAnswers[q.id]"
            :type="q.type === 'short_answer' ? 'textarea' : 'text'"
            :rows="q.type === 'short_answer' ? 4 : 1"
            :placeholder="q.type === 'short_answer' ? '请在此输入您的论述或答题要点...' : '请在此填写您的答案...'"
            size="large"
            @input="resetIdleTimer"
          />
        </div>
      </div>
    </main>

    <!-- 4. 底部吸底操作浮动栏 (Fixed Bottom Floating Bar) -->
    <footer v-if="exam && !loadError" class="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div class="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <!-- 答题进度信息 -->
        <div class="flex-1">
          <div class="flex items-center justify-between text-xs mb-1.5">
            <span class="font-bold text-gray-700">答题进度</span>
            <span class="font-extrabold text-blue-600">{{ answeredCount }} / {{ exam.questions.length }} 题</span>
          </div>
          <el-progress
            :percentage="Math.round((answeredCount / (exam.questions.length || 1)) * 100)"
            :stroke-width="6"
            :show-text="false"
            status="primary"
          />
        </div>

        <!-- 交卷主按钮 -->
        <el-button
          type="primary"
          size="large"
          class="font-extrabold px-6 rounded-xl shadow-md text-sm shrink-0"
          :loading="submitting"
          @click="handlePreSubmit"
        >
          <span>🚀 提交试卷</span>
        </el-button>
      </div>
    </footer>

    <!-- 切屏警告弹窗 -->
    <el-dialog v-model="showCheatingWarning" title="⚠️ 切屏监控警告" width="90%" center :show-close="false">
      <div class="text-center py-2 space-y-2">
        <p class="text-red-600 font-bold text-base">检测到您离开了考试页面！</p>
        <p class="text-xs text-gray-500 leading-relaxed">
          系统已记录您的切屏行为（当前已切屏: <b class="text-red-600 font-bold">{{ switchCount }}</b> 次）。达到 3 次将强制自动交卷！
        </p>
      </div>
      <template #footer>
        <el-button type="primary" class="w-full font-bold" @click="showCheatingWarning = false">我已知晓，继续答题</el-button>
      </template>
    </el-dialog>

    <!-- 无操作检测超时提醒弹窗 -->
    <el-dialog v-model="showIdleWarning" title="⏱️ 无操作提醒" width="90%" center :show-close="false">
      <div class="text-center py-2 space-y-2">
        <p class="text-amber-600 font-bold text-base">您已较长时间未操作试卷！</p>
        <p class="text-xs text-gray-500">为防止替考，若 <b class="text-red-500">{{ idleCountdown }}</b> 秒内无响应将自动提交试卷。</p>
      </div>
      <template #footer>
        <el-button type="primary" class="w-full font-bold" @click="resetIdleTimer">恢复答题状态</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const submitting = ref(false);
const loadError = ref(false);
const loadErrorMessage = ref('');
const exam = ref(null);

const nameInputRef = ref(null);
const nameHighlight = ref(false);

const userInfoForm = reactive({
  name: '',
  student_id: '',
  department: ''
});

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

// 已作答数量统计
const answeredCount = computed(() => {
  if (!exam.value?.questions) return 0;
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

const getTypeBadgeClass = (type) => {
  const map = {
    single_choice: 'bg-blue-50 text-blue-600',
    multi_choice: 'bg-purple-50 text-purple-600',
    true_false: 'bg-emerald-50 text-emerald-600',
    fill_blank: 'bg-amber-50 text-amber-600',
    short_answer: 'bg-slate-100 text-slate-700'
  };
  return map[type] || 'bg-gray-100 text-gray-600';
};

const formatCountdown = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// 获取试卷数据并秒级渲染全卷
const fetchExamData = async () => {
  loading.value = true;
  loadError.value = false;
  loadErrorMessage.value = '';

  try {
    const res = await axios.get(`/api/qr/redirect/${route.params.codeKey}`);
    if (res.data?.success && res.data?.data?.exam) {
      exam.value = res.data.data.exam;
      requiredFields.value = exam.value.requiredFields || ['name'];

      // 初始化多选题答案数组
      exam.value.questions.forEach(q => {
        if (q.type === 'multi_choice') {
          userAnswers[q.id] = [];
        }
      });

      // 自动启动倒计时 (若有限时)
      if (exam.value.durationMinutes > 0) {
        remainingSeconds.value = exam.value.durationMinutes * 60;
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          remainingSeconds.value--;
          if (remainingSeconds.value <= 0) {
            clearInterval(timerInterval);
            ElMessage.warning('考试限时已到，系统正在自动为您交卷...');
            executeSubmit();
          }
        }, 1000);
      }

      // 自动启动防切屏作弊监控与无操作检测
      bindAntiCheating();
      resetIdleTimer();
    } else {
      throw new Error(res.data?.message || '试卷信息异常');
    }
  } catch (err) {
    console.error('fetchExamData error:', err);
    loadError.value = true;
    loadErrorMessage.value = err.response?.data?.message || err.message || '加载试卷失败，请重试';
    ElMessage.error(loadErrorMessage.value);
  } finally {
    loading.value = false;
  }
};

const toggleMultiChoice = (qId, option) => {
  if (!userAnswers[qId]) userAnswers[qId] = [];
  const idx = userAnswers[qId].indexOf(option);
  if (idx > -1) {
    userAnswers[qId].splice(idx, 1);
  } else {
    userAnswers[qId].push(option);
  }
  resetIdleTimer();
};

// 切屏监听
const handleVisibilityChange = () => {
  if (document.hidden && exam.value?.examRules?.preventCheating) {
    switchCount.value++;
    showCheatingWarning.value = true;
    if (switchCount.value >= 3) {
      ElMessage.error('频繁切屏超过 3 次上限，系统强制交卷！');
      executeSubmit();
    }
  }
};

const bindAntiCheating = () => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
};

// 无操作检测
const resetIdleTimer = () => {
  showIdleWarning.value = false;
  clearInterval(idleCountdownInterval);
  clearTimeout(idleTimer);

  const idleSeconds = exam.value?.examRules?.idleTimeoutSeconds || 120;
  idleTimer = setTimeout(() => {
    showIdleWarning.value = true;
    idleCountdown.value = 10;
    idleCountdownInterval = setInterval(() => {
      idleCountdown.value--;
      if (idleCountdown.value <= 0) {
        clearInterval(idleCountdownInterval);
        executeSubmit();
      }
    }, 1000);
  }, idleSeconds * 1000);
};

// 交卷前校验：若未填姓名平滑滚动回顶部姓名框，未答完题目弹出温馨确认
const handlePreSubmit = async () => {
  if (requiredFields.value.includes('name') && !userInfoForm.name?.trim()) {
    ElMessage.warning('请在试卷顶部填写您的姓名再交卷哦！');
    nameHighlight.value = true;
    // 平滑滚动回试卷顶部考生信息登记区域
    const target = document.getElementById('candidate-info-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    await nextTick();
    nameInputRef.value?.focus?.();
    return;
  }

  const totalQuestions = exam.value?.questions?.length || 0;
  const unAnswered = totalQuestions - answeredCount.value;

  if (unAnswered > 0) {
    try {
      await ElMessageBox.confirm(
        `您还有 ${unAnswered} 道题目尚未作答，确定现在提交试卷吗？`,
        '交卷确认',
        {
          confirmButtonText: '确定交卷',
          cancelButtonText: '继续作答',
          type: 'warning'
        }
      );
      executeSubmit();
    } catch (err) {
      // 用户取消，继续作答
    }
  } else {
    try {
      await ElMessageBox.confirm(
        '所有题目已作答完毕，确定提交试卷吗？交卷后将实时出分。',
        '交卷确认',
        {
          confirmButtonText: '确认提交',
          cancelButtonText: '再检查一下',
          type: 'primary'
        }
      );
      executeSubmit();
    } catch (err) {}
  }
};

// 执行交卷提交
const executeSubmit = async () => {
  clearInterval(timerInterval);
  clearTimeout(idleTimer);
  clearInterval(idleCountdownInterval);
  document.removeEventListener('visibilitychange', handleVisibilityChange);

  submitting.value = true;
  try {
    const payload = {
      examId: exam.value.id,
      userInfo: userInfoForm,
      answers: userAnswers,
      switchCount: switchCount.value
    };

    const res = await axios.post('/api/submissions', payload);
    if (res.data?.success) {
      ElMessage.success('试卷提交成功！正在生成成绩单...');
      router.push({
        name: 'ExamResult',
        query: { resultData: JSON.stringify(res.data.data) }
      });
    } else {
      throw new Error(res.data?.message || '提交失败');
    }
  } catch (err) {
    console.error('submit error:', err);
    ElMessage.error(err.response?.data?.message || err.message || '交卷失败，请重试');
  } finally {
    submitting.value = false;
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
