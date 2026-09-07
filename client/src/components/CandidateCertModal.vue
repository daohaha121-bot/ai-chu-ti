<template>
  <el-dialog
    v-model="visible"
    title="📜 考生官方成绩证明单"
    width="580px"
    center
    destroy-on-close
  >
    <div class="space-y-4">
      <!-- 渲染的高清证书卡片 (html2canvas 导出区域) -->
      <div class="flex justify-center p-2 bg-gray-100 rounded-xl overflow-hidden">
        <div
          id="candidate-cert-capture-area"
          class="w-[480px] bg-amber-50/40 p-8 rounded-2xl shadow-md border-4 border-amber-900/20 relative text-gray-800"
          style="background-image: radial-gradient(#d97706 0.5px, transparent 0.5px); background-size: 20px 20px;"
        >
          <!-- 内边框装饰线 -->
          <div class="border-2 border-dashed border-amber-900/30 p-6 rounded-xl relative space-y-5 bg-white/90 shadow-sm backdrop-blur-xs">
            <!-- 顶部 Header: Logo 与 机构抬头 -->
            <div class="text-center space-y-1.5 border-b border-amber-900/20 pb-4">
              <div class="flex items-center justify-center gap-2">
                <img v-if="systemConfig?.logoUrl" :src="systemConfig.logoUrl" class="h-7 w-auto" />
                <span v-else class="text-xl">🏛️</span>
                <span class="text-xs font-black tracking-widest text-amber-950 uppercase">
                  {{ systemConfig?.platformName || 'AI 智能在线考试认证中心' }}
                </span>
              </div>

              <h1 class="text-xl font-black text-amber-950 tracking-wider pt-1">
                在线考核成绩证明单
              </h1>

              <div class="text-[10px] text-amber-800/80 font-mono">
                存证编号: CERT-{{ (submission?.id || '00000000').slice(0, 8).toUpperCase() }}-{{ new Date(submission?.submittedAt || Date.now()).getFullYear() }}
              </div>
            </div>

            <!-- 证明正文引导语 -->
            <div class="text-xs text-gray-700 leading-relaxed indent-4">
              兹证明以下考生已按考试纪律要求，准时参加并完成本次线上标准化考核，考核过程与答卷结果经系统严格验核，数据真实有效，特此出具本成绩证明：
            </div>

            <!-- 考生个人与成绩详情卡片 -->
            <div class="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs space-y-2.5">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="text-gray-500">考生姓名:</span>
                  <span class="font-bold text-gray-900 ml-1.5 text-sm">{{ submission?.userInfo?.name || '匿名' }}</span>
                </div>
                <div>
                  <span class="text-gray-500">学号/工号:</span>
                  <span class="font-mono font-bold text-gray-800 ml-1.5">{{ submission?.userInfo?.student_id || '-' }}</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="text-gray-500">部门/班级:</span>
                  <span class="font-medium text-gray-800 ml-1.5">{{ submission?.userInfo?.department || '-' }}</span>
                </div>
                <div>
                  <span class="text-gray-500">交卷时间:</span>
                  <span class="font-medium text-gray-800 ml-1.5">{{ formatDate(submission?.submittedAt) }}</span>
                </div>
              </div>

              <div class="pt-2 border-t border-amber-200/60">
                <span class="text-gray-500">考核科目:</span>
                <span class="font-bold text-gray-900 ml-1.5">{{ exam?.title || '综合测试试卷' }}</span>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-amber-200/60 bg-white/70 p-3 rounded-lg">
                <div>
                  <div class="text-[11px] text-gray-500">考核总分 / 及格线</div>
                  <div class="text-xs font-bold text-gray-800">{{ submission?.totalScore || 100 }}分 / {{ exam?.passScore || 60 }}分</div>
                </div>

                <div class="text-right">
                  <div class="text-[11px] text-gray-500">考生最终得分</div>
                  <div class="text-2xl font-black" :class="submission?.isPassed ? 'text-emerald-700' : 'text-red-600'">
                    {{ submission?.score || 0 }} <span class="text-xs font-bold text-gray-600">分</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 签发落款与官方防伪红章 -->
            <div class="pt-2 flex items-end justify-between relative">
              <div class="text-[10px] text-gray-400 space-y-0.5">
                <div>防伪校验: 系统切屏监控记录 ({{ submission?.switchCount || 0 }} 次)</div>
                <div>认证效力: 数字签章防伪存证</div>
              </div>

              <div class="text-right text-xs text-gray-700 space-y-1 relative pr-4">
                <div class="font-bold text-amber-950">{{ systemConfig?.platformName || '考核认证委员会' }}</div>
                <div class="text-[11px] font-mono text-gray-500">{{ formatDate(submission?.submittedAt, true) }}</div>

                <!-- 权威红色电子印章 -->
                <div
                  class="absolute -top-7 -right-3 w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center pointer-events-none select-none -rotate-12 opacity-85 shadow-xs"
                  :class="submission?.isPassed ? 'border-red-600 text-red-600' : 'border-gray-500 text-gray-500'"
                  style="border-style: double; border-width: 4px;"
                >
                  <div class="text-[9px] font-bold tracking-tight text-center px-1 truncate max-w-[90px]">
                    {{ (systemConfig?.platformName || '在线考试考核').slice(0, 8) }}
                  </div>
                  <div class="text-xs my-0.5">★</div>
                  <div class="text-sm font-black tracking-widest">
                    {{ submission?.isPassed ? '考核合格' : '未达标' }}
                  </div>
                  <div class="text-[8px] tracking-tight">官方认证专用章</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="pt-3 border-t flex items-center justify-end gap-3">
        <el-button @click="visible = false">关闭</el-button>
        <el-button type="primary" size="large" :loading="downloading" class="font-bold shadow" @click="downloadCertificate">
          <el-icon class="mr-1"><Download /></el-icon>
          保存 2x 高清成绩单证明图片 (PNG)
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import html2canvas from 'html2canvas';
import { downloadCanvas } from '../utils/downloadHelper';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  submission: { type: Object, default: () => ({}) },
  exam: { type: Object, default: () => ({}) },
  systemConfig: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const downloading = ref(false);

const formatDate = (dateStr, dateOnly = false) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (dateOnly) {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return d.toLocaleString('zh-CN', { hour12: false });
};

// 导出 2x 高清证明图片
const downloadCertificate = async () => {
  const element = document.getElementById('candidate-cert-capture-area');
  if (!element) return;

  downloading.value = true;
  try {
    ElMessage.info('正在生成官方成绩证明图片...');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    const candidateName = props.submission?.userInfo?.name || '考生';
    const examTitle = props.exam?.title || '考试';
    downloadCanvas(canvas, `${candidateName}_${examTitle}_成绩证明单.png`);
    ElMessage.success('成绩证明图片已成功保存！');
  } catch (err) {
    console.error('成绩单导出失败:', err);
    ElMessage.error('导出失败: ' + err.message);
  } finally {
    downloading.value = false;
  }
};
</script>
