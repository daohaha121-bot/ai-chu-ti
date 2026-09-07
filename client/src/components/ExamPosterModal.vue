<template>
  <el-dialog
    v-model="visible"
    :title="'🖼️ ' + (exam?.title || '考试') + ' - 专属宣传海报二维码'"
    width="580px"
    center
    destroy-on-close
  >
    <div class="space-y-4">
      <!-- 主题风格切换栏 -->
      <div class="flex items-center justify-between bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 text-xs">
        <span class="font-bold text-gray-600 flex items-center gap-1.5">
          <el-icon><Brush /></el-icon>
          海报视觉主题切换:
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 text-xs"
            :class="theme === 'blue' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'"
            @click="theme = 'blue'"
          >
            <span>🔵</span> 商务科技蓝
          </button>

          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 text-xs"
            :class="theme === 'redGold' ? 'bg-amber-700 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'"
            @click="theme = 'redGold'"
          >
            <span>🔴</span> 官方庄重红金
          </button>

          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 text-xs"
            :class="theme === 'white' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'"
            @click="theme = 'white'"
          >
            <span>⚪</span> 极简典雅白
          </button>
        </div>
      </div>

      <!-- 渲染的高清考试海报卡片 (可导出区域) -->
      <div class="flex justify-center p-1">
        <div
          id="exam-poster-capture-area"
          class="w-[380px] rounded-2xl shadow-xl overflow-hidden text-center transition-all relative border"
          :class="themeCardClass"
        >
          <!-- 背景装饰光晕 -->
          <div data-html2canvas-ignore="true" class="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-40" :class="themeGlowClass"></div>
          <div data-html2canvas-ignore="true" class="absolute -bottom-12 -left-12 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-30" :class="themeGlowClass"></div>

          <!-- 海报 Header: 考试名称与答题须知 -->
          <div class="p-6 pb-3 space-y-3 relative z-10">
            <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase border" :class="themeBadgeClass">
              <span>●</span> 在线考核 · 扫码答题 <span>●</span>
            </div>

            <h2 class="text-xl font-black leading-snug tracking-tight px-1" :class="themeTitleClass">
              {{ exam?.title || '在线考试' }}
            </h2>

            <p class="text-xs line-clamp-2 px-2" :class="themeSubtitleClass">
              {{ exam?.description || '微信或手机扫码即答，请在规定时间内诚信完成考试。' }}
            </p>

            <!-- 考试参数 Chips -->
            <div class="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border" :class="themeChipClass">
                <span>🎯 满分:</span>
                <b class="font-black">{{ exam?.totalScore || 100 }}分</b>
              </span>

              <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border" :class="themeChipClass">
                <span>⏱️ 限时:</span>
                <b class="font-black">{{ exam?.durationMinutes > 0 ? exam.durationMinutes + '分钟' : '不限时' }}</b>
              </span>

              <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border" :class="themeChipClass">
                <span>🏅 及格:</span>
                <b class="font-black">{{ exam?.passScore || 60 }}分</b>
              </span>
            </div>
          </div>

          <!-- 海报 Core: 二维码与周边精美装饰图 -->
          <div class="px-6 py-4 flex flex-col items-center relative z-10">
            <!-- 二维码包裹器 (带精美边框角标) -->
            <div id="exam-poster-qr-wrapper" class="p-4 rounded-2xl shadow-lg relative transition" :class="themeQrBoxClass">
              <!-- 四个精致拐角修饰 -->
              <div class="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2" :class="themeCornerClass"></div>
              <div class="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2" :class="themeCornerClass"></div>
              <div class="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2" :class="themeCornerClass"></div>
              <div class="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2" :class="themeCornerClass"></div>

              <!-- 核心二维码 -->
              <qrcode-vue
                v-if="qrCodeKey"
                :value="getScanUrl(qrCodeKey)"
                :size="170"
                level="H"
                class="rounded-lg"
              />
              <div v-else class="w-[170px] h-[170px] flex items-center justify-center text-xs text-gray-400">
                加载二维码中...
              </div>
            </div>

            <!-- 快捷下载与扫码说明 -->
            <div class="mt-3 flex items-center justify-center gap-2">
              <span class="text-xs font-bold" :class="themeScanTextClass">
                📱 微信/手机扫码即答
              </span>
            </div>
          </div>

          <!-- 海报 Footer: 官方保障特性与水印 -->
          <div class="px-6 pb-6 pt-2 border-t relative z-10 space-y-3" :class="themeDividerClass">
            <div class="grid grid-cols-3 gap-1 text-[10px]" :class="themeFeaturesClass">
              <div class="flex flex-col items-center gap-0.5">
                <span class="text-xs">🛡️</span>
                <span>防切屏作弊监控</span>
              </div>
              <div class="flex flex-col items-center gap-0.5">
                <span class="text-xs">⚡</span>
                <span>交卷即刻出分</span>
              </div>
              <div class="flex flex-col items-center gap-0.5">
                <span class="text-xs">📊</span>
                <span>官方成绩备案</span>
              </div>
            </div>

            <div class="text-[10px] tracking-wider uppercase font-medium opacity-60 flex items-center justify-center gap-1">
              <span>● AI 智能考试平台 · 权威技术支持 ●</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 链接复制行 -->
      <div class="flex items-center gap-2">
        <el-input :model-value="getScanUrl(qrCodeKey)" readonly size="default" />
        <el-button type="primary" plain @click="copyScanUrl(qrCodeKey)">
          <el-icon class="mr-1"><CopyDocument /></el-icon>
          复制链接
        </el-button>
      </div>

      <!-- 底部核心操作 -->
      <div class="pt-2 border-t flex items-center justify-between gap-3 flex-wrap">
        <el-button type="info" plain @click="openH5Preview(qrCodeKey)">
          <el-icon class="mr-1"><View /></el-icon>
          模拟答题
        </el-button>

        <div class="flex items-center gap-2">
          <el-button @click="visible = false">关闭</el-button>
          <el-button type="success" class="font-bold shadow" @click="downloadPureQr">
            <el-icon class="mr-1"><Download /></el-icon>
            一键下载纯二维码 (PNG)
          </el-button>
          <el-button type="primary" :loading="downloading" class="font-bold shadow" @click="downloadPoster">
            <el-icon class="mr-1"><Picture /></el-icon>
            一键下载宣传海报 (PNG)
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import QrcodeVue from 'qrcode.vue';
import html2canvas from 'html2canvas';
import api from '../utils/api';
import { downloadCanvas, downloadQrCodeFromContainer, getExamScanUrl } from '../utils/downloadHelper';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  exam: { type: Object, default: () => ({}) },
  qrCode: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const theme = ref('blue'); // 'blue', 'redGold', 'white'
const downloading = ref(false);
const internalQrCode = ref(null);

// 自动补齐兜底：若父组件未注入二维码，则弹窗根据试卷 ID 自动请求
watch(
  () => [props.modelValue, props.exam?.id],
  async ([val, examId]) => {
    if (val && examId && !props.qrCode?.codeKey && !props.exam?.qrCodes?.length) {
      try {
        const res = await api.get(`/qr/by-exam/${examId}`);
        if (res.data?.success && res.data?.data) {
          internalQrCode.value = res.data.data;
        }
      } catch (err) {}
    }
  },
  { immediate: true }
);

const qrCodeKey = computed(() => {
  return props.qrCode?.codeKey || internalQrCode.value?.codeKey || (props.exam?.qrCodes && props.exam.qrCodes[0]?.codeKey) || '';
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

// 1. 一键下载纯二维码图片 (PNG)
const downloadPureQr = () => {
  const success = downloadQrCodeFromContainer(
    'exam-poster-qr-wrapper',
    `${props.exam?.title || '考试'}_二维码.png`,
    props.exam?.title
  );
  if (success) {
    ElMessage.success('考试二维码已一键保存至本地！');
  } else {
    ElMessage.warning('二维码尚未加载完成，请稍候重试');
  }
};

// 2. 一键导出 2x 高清宣传海报图片 (PNG)
const downloadPoster = async () => {
  const element = document.getElementById('exam-poster-capture-area');
  if (!element) return;

  downloading.value = true;
  try {
    ElMessage.info('正在渲染 2x 高清宣传海报图片...');
    const bgColor = theme.value === 'blue' ? '#0f172a' : (theme.value === 'redGold' ? '#450a0a' : '#ffffff');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: bgColor
    });
    downloadCanvas(canvas, `${props.exam?.title || '考试'}_宣传海报二维码.png`);
    ElMessage.success('高清海报图片已成功保存！');
  } catch (err) {
    console.error('海报导出失败:', err);
    ElMessage.error('海报导出失败: ' + err.message);
  } finally {
    downloading.value = false;
  }
};

// 样式类计算
const themeCardClass = computed(() => {
  if (theme.value === 'blue') {
    return 'bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white border-blue-800';
  } else if (theme.value === 'redGold') {
    return 'bg-gradient-to-b from-red-950 via-rose-900 to-amber-950 text-white border-amber-600/50';
  } else {
    return 'bg-gradient-to-b from-white via-slate-50 to-gray-100 text-slate-800 border-gray-200 shadow-md';
  }
});

const themeGlowClass = computed(() => {
  if (theme.value === 'blue') return 'bg-blue-500';
  if (theme.value === 'redGold') return 'bg-amber-400';
  return 'bg-slate-300';
});

const themeBadgeClass = computed(() => {
  if (theme.value === 'blue') return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
  if (theme.value === 'redGold') return 'bg-amber-400/20 text-amber-300 border-amber-400/40';
  return 'bg-slate-100 text-slate-600 border-slate-300';
});

const themeTitleClass = computed(() => {
  if (theme.value === 'blue') return 'text-white drop-shadow';
  if (theme.value === 'redGold') return 'text-amber-100 drop-shadow';
  return 'text-gray-900';
});

const themeSubtitleClass = computed(() => {
  if (theme.value === 'blue') return 'text-blue-200/80';
  if (theme.value === 'redGold') return 'text-amber-200/80';
  return 'text-gray-500';
});

const themeChipClass = computed(() => {
  if (theme.value === 'blue') return 'bg-blue-900/50 text-blue-200 border-blue-700/50';
  if (theme.value === 'redGold') return 'bg-rose-900/60 text-amber-200 border-amber-600/40';
  return 'bg-white text-gray-700 border-gray-200 shadow-xs';
});

const themeQrBoxClass = computed(() => {
  return 'bg-white p-3 border-2 border-white shadow-2xl';
});

const themeCornerClass = computed(() => {
  if (theme.value === 'blue') return 'border-blue-500';
  if (theme.value === 'redGold') return 'border-amber-500';
  return 'border-slate-800';
});

const themeScanTextClass = computed(() => {
  if (theme.value === 'blue') return 'text-blue-300';
  if (theme.value === 'redGold') return 'text-amber-300';
  return 'text-slate-600';
});

const themeDividerClass = computed(() => {
  if (theme.value === 'blue') return 'border-blue-800/60';
  if (theme.value === 'redGold') return 'border-amber-700/50';
  return 'border-gray-200';
});

const themeFeaturesClass = computed(() => {
  if (theme.value === 'blue') return 'text-blue-300/90';
  if (theme.value === 'redGold') return 'text-amber-300/90';
  return 'text-gray-600';
});
</script>
