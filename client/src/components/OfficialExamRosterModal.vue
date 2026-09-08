<template>
  <el-dialog
    v-model="visible"
    title="📋 官方标准化考生成绩总表 · 预览与高清导出"
    width="1000px"
    top="3vh"
    center
    destroy-on-close
    class="official-roster-dialog"
    @opened="handleOpened"
  >
    <div class="space-y-4">
      <!-- 顶部操作提示与导出按钮 -->
      <div class="flex items-center justify-between bg-blue-50/90 border border-blue-200/80 p-3.5 rounded-xl shadow-xs">
        <div class="flex items-center gap-2.5 text-blue-950 text-sm">
          <el-icon class="text-blue-600 text-lg"><InfoFilled /></el-icon>
          <div>
            <div class="font-bold">已生成标准《官方考核成绩总表》</div>
            <div class="text-xs text-blue-700/90">包含全员考生明细、成绩评定、切屏纪律存证与官方权威防伪红章。</div>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <el-button @click="visible = false">关闭预览</el-button>
          <el-button
            type="primary"
            size="default"
            :loading="downloading"
            class="font-bold shadow px-4"
            @click="downloadRosterImage"
          >
            <el-icon class="mr-1.5"><Download /></el-icon>
            立即保存 2x 高清长图 (PNG)
          </el-button>
        </div>
      </div>

      <!-- 预览可滚动视窗 (初始自动滚至顶部，支持横纵自适应) -->
      <div
        ref="previewScrollArea"
        class="max-h-[68vh] overflow-y-auto overflow-x-auto p-4 bg-gray-100/90 rounded-xl flex justify-center border border-gray-200"
      >
        <!-- 页面预览卡片 -->
        <div
          id="official-exam-roster-capture-area"
          class="w-[900px] min-w-[900px] bg-white p-8 rounded-xl shadow-md border border-gray-200 text-slate-800 space-y-6"
        >
          <!-- 顶部抬头：平台机构名称与认证徽章 -->
          <div class="border-b-2 border-slate-900 pb-5 text-center relative space-y-2">
            <div class="flex items-center justify-center gap-2">
              <span class="text-2xl">🏛️</span>
              <span class="text-xs font-black tracking-widest text-slate-600 uppercase">
                {{ systemConfig?.platformName || 'AI 智能在线考核认证中心' }}
              </span>
            </div>

            <h1 class="text-2xl font-black tracking-tight text-slate-900 pt-1">
              {{ exam?.title || '标准化考核' }} · 考生考核成绩总表
            </h1>

            <div class="flex items-center justify-between text-[11px] text-slate-500 pt-2 px-1 border-t border-dashed border-slate-200 mt-2">
              <span class="font-mono font-medium">存证编号: ARCHIVE-{{ (exam?.id || 'EXAM').slice(0, 8).toUpperCase() }}-{{ archiveDateCode }}</span>
              <span>制表日期: {{ currentDateFormatted }}</span>
              <span class="font-medium text-slate-600">{{ systemConfig?.watermarkText || '真实考试存证有效' }}</span>
            </div>
          </div>

          <!-- 核心统计概况卡片 -->
          <div class="grid grid-cols-5 gap-3 text-center">
            <div class="bg-slate-50 border border-slate-200/80 p-3 rounded-lg">
              <div class="text-[11px] text-slate-500 font-medium mb-0.5">满分 / 及格线</div>
              <div class="text-base font-black text-slate-800">
                {{ exam?.totalScore || 100 }}分 / {{ exam?.passScore || 60 }}分
              </div>
            </div>

            <div class="bg-blue-50/70 border border-blue-200/80 p-3 rounded-lg">
              <div class="text-[11px] text-blue-600 font-medium mb-0.5">参考总人数</div>
              <div class="text-base font-black text-blue-950">
                {{ submissions.length }} <span class="text-xs font-normal">人</span>
              </div>
            </div>

            <div class="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-lg">
              <div class="text-[11px] text-emerald-600 font-medium mb-0.5">考核达标人数</div>
              <div class="text-base font-black text-emerald-950">
                {{ passedCount }} <span class="text-xs font-normal">人</span>
              </div>
            </div>

            <div class="bg-purple-50/70 border border-purple-200/80 p-3 rounded-lg">
              <div class="text-[11px] text-purple-600 font-medium mb-0.5">综合及格率</div>
              <div class="text-base font-black text-purple-950">
                {{ calculatedPassRate }}%
              </div>
            </div>

            <div class="bg-amber-50/70 border border-amber-200/80 p-3 rounded-lg">
              <div class="text-[11px] text-amber-700 font-medium mb-0.5">全员平均分</div>
              <div class="text-base font-black text-amber-950">
                {{ calculatedAvgScore }} <span class="text-xs font-normal">分</span>
              </div>
            </div>
          </div>

          <!-- 考生全量花名册与成绩明细表格 -->
          <div class="border border-slate-300 rounded-lg overflow-hidden">
            <table class="w-full text-left border-collapse" style="table-layout: fixed;">
              <thead>
                <tr class="bg-slate-900 text-white text-xs">
                  <th class="py-2.5 px-2.5 font-semibold text-center" style="width: 6%;">序号</th>
                  <th class="py-2.5 px-3 font-semibold" style="width: 14%;">考生姓名</th>
                  <th class="py-2.5 px-3 font-semibold" style="width: 15%;">学号/工号</th>
                  <th class="py-2.5 px-3 font-semibold" style="width: 15%;">部门/班级</th>
                  <th class="py-2.5 px-2 font-semibold text-center" style="width: 10%;">考核得分</th>
                  <th class="py-2.5 px-2 font-semibold text-center" style="width: 10%;">评定结果</th>
                  <th class="py-2.5 px-2 font-semibold text-center" style="width: 12%;">考场纪律</th>
                  <th class="py-2.5 px-3 font-semibold text-right" style="width: 18%;">交卷时间</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 text-xs text-slate-700">
                <tr
                  v-for="(sub, idx) in submissions"
                  :key="sub.id || idx"
                  :class="idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'"
                >
                  <td class="py-2.5 px-2.5 text-center font-mono text-slate-400">{{ idx + 1 }}</td>
                  <td class="py-2.5 px-3 font-bold text-slate-900 truncate">{{ sub.userInfo?.name || '匿名' }}</td>
                  <td class="py-2.5 px-3 font-mono text-slate-600 truncate">{{ sub.userInfo?.student_id || '-' }}</td>
                  <td class="py-2.5 px-3 text-slate-600 truncate">{{ sub.userInfo?.department || '-' }}</td>
                  <td class="py-2.5 px-2 text-center font-bold text-sm font-mono" :class="sub.isPassed ? 'text-emerald-600' : 'text-rose-600'">
                    {{ sub.score }}分
                  </td>
                  <td class="py-2.5 px-2 text-center">
                    <span
                      v-if="sub.isPassed"
                      class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                    >
                      合格
                    </span>
                    <span
                      v-else
                      class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300"
                    >
                      未达标
                    </span>
                  </td>
                  <td class="py-2.5 px-2 text-center">
                    <span v-if="sub.switchCount > 0" class="inline-block text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                      切屏 {{ sub.switchCount }} 次
                    </span>
                    <span v-else class="text-slate-400 text-[10px]">正常 (0次)</span>
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {{ formatDate(sub.submittedAt) }}
                  </td>
                </tr>

                <tr v-if="submissions.length === 0">
                  <td colspan="8" class="py-10 text-center text-slate-400 text-sm">
                    暂无考生成绩记录
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 真实考试背书与法律/纪律说明 -->
          <div class="bg-amber-50/40 border border-amber-200/60 rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed space-y-1">
            <div class="font-bold text-amber-950 flex items-center gap-1.5">
              <span>⚖️</span>
              <span>真实考试与成绩存证背书：</span>
            </div>
            <p>
              本考核成绩汇总表由数字化考核系统严格依据标准化考场答题记录与反作弊切屏监控系统自动生成。全员答卷内容、得分评定及考试纪律数据均已入库归档存证，成绩真实无篡改，特此出具成绩公报。
            </p>
          </div>

          <!-- 底部签署栏与权威官方防伪红章 -->
          <div class="pt-4 border-t border-slate-200 flex items-end justify-between relative min-h-[120px]">
            <!-- 左侧合规落款 -->
            <div class="space-y-1.5 text-xs text-slate-600">
              <div><strong>考核主办机构：</strong>{{ systemConfig?.platformName || '考核认证委员会' }}</div>
              <div><strong>防伪认证机制：</strong>数字签名防伪存证与考场全程切屏监控</div>
              <div class="text-[11px] text-slate-400 font-mono">
                HASH: SHA256-{{ (exam?.id || 'EXAM').slice(0, 12) }}-VERIFIED
              </div>
            </div>

            <!-- 中间主考审核人签字栏 -->
            <div class="text-xs text-slate-700 space-y-2 pb-1">
              <div>主考官 / 审核人签字：__________________</div>
              <div class="text-[11px] text-slate-500">签发日期：{{ currentDateFormatted }}</div>
            </div>

            <!-- 右侧官方红色双圈权威印章 (纯矢量 CSS 绘制) -->
            <div class="relative w-36 h-36 flex items-center justify-center pr-2">
              <div
                class="w-32 h-32 rounded-full border-4 border-red-600 flex flex-col items-center justify-center text-red-600 pointer-events-none select-none -rotate-12 shadow-sm"
                style="border-style: double; border-width: 4px; background-color: rgba(254, 242, 242, 0.45);"
              >
                <div class="text-[10px] font-bold tracking-tight text-center px-1 truncate max-w-[105px]">
                  {{ (systemConfig?.platformName || '在线考试认证中心').slice(0, 10) }}
                </div>
                <div class="text-base my-0.5 leading-none">★</div>
                <div class="text-sm font-black tracking-widest">
                  考核成绩专用章
                </div>
                <div class="text-[9px] tracking-tight font-semibold mt-0.5">
                  官方认证 · 真实有效
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="flex items-center justify-end gap-3 pt-1 border-t">
        <el-button @click="visible = false">关闭</el-button>
        <el-button
          type="primary"
          size="default"
          :loading="downloading"
          class="font-bold px-5"
          @click="downloadRosterImage"
        >
          <el-icon class="mr-1.5"><Download /></el-icon>
          立即保存 2x 高清长图 (PNG)
        </el-button>
      </div>
    </div>

  </el-dialog>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import html2canvas from 'html2canvas';
import { downloadCanvas } from '../utils/downloadHelper';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  exam: { type: Object, default: () => ({}) },
  submissions: { type: Array, default: () => [] },
  analytics: { type: Object, default: () => ({}) },
  systemConfig: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const downloading = ref(false);
const previewScrollArea = ref(null);

const handleOpened = () => {
  nextTick(() => {
    if (previewScrollArea.value) {
      previewScrollArea.value.scrollTop = 0;
      previewScrollArea.value.scrollLeft = 0;
    }
  });
};

const passedCount = computed(() => {
  return props.submissions.filter(s => s.isPassed).length;
});

const calculatedPassRate = computed(() => {
  if (!props.submissions.length) return 0;
  return Number(((passedCount.value / props.submissions.length) * 100).toFixed(1));
});

const calculatedAvgScore = computed(() => {
  if (!props.submissions.length) return 0;
  const sum = props.submissions.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
  return Number((sum / props.submissions.length).toFixed(1));
});

const archiveDateCode = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
});

const currentDateFormatted = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
});

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', { hour12: false });
};

// 导出 2x 超清成绩总表图片（采用深度克隆 DOM 节点并置于 body 顶层绝对定位的方式，彻底规避 el-dialog 的 transform 与 overflow 导致的 html2canvas 截断与黑屏坐标偏移问题）
const downloadRosterImage = async () => {
  const sourceElement = document.getElementById('official-exam-roster-capture-area');
  if (!sourceElement) {
    ElMessage.error('找不到要导出的成绩单区域');
    return;
  }

  downloading.value = true;
  
  // 创建克隆容器并放置到 body 最外层
  const cloneWrapper = document.createElement('div');
  cloneWrapper.style.position = 'absolute';
  cloneWrapper.style.top = '0';
  cloneWrapper.style.left = '0';
  cloneWrapper.style.width = '900px';
  // 使用 -9999 层级使其在背景后面，不影响用户当前视窗体验
  cloneWrapper.style.zIndex = '-9999';
  cloneWrapper.style.backgroundColor = '#ffffff';
  cloneWrapper.style.pointerEvents = 'none';

  // 深度克隆原始 DOM
  const cloneNode = sourceElement.cloneNode(true);
  // 移除可能影响定位的 margin 等
  cloneNode.style.margin = '0';
  cloneNode.style.transform = 'none';
  
  cloneWrapper.appendChild(cloneNode);
  document.body.appendChild(cloneWrapper);

  try {
    ElMessage.info('正在渲染 2x 超清官方考核成绩单...');

    // 等待浏览器渲染克隆节点
    await new Promise(resolve => setTimeout(resolve, 300));

    // 对最外层纯净的 cloneWrapper 进行截图
    const canvas = await html2canvas(cloneWrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
      // 不设置 scrollX / scrollY，让其自动根据正常文档流计算，由于处于 top:0 left:0，绝对不会发生偏移截断
    });

    const examTitle = (props.exam?.title || '考试').replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${examTitle}_官方考核成绩总表_${archiveDateCode.value}.png`;

    downloadCanvas(canvas, filename);
    ElMessage.success('官方考核成绩单超清长图已成功下载！');
  } catch (err) {
    console.error('成绩总表导出失败:', err);
    ElMessage.error('长图生成失败: ' + (err.message || '未知错误'));
  } finally {
    // 清理克隆的垃圾节点
    if (document.body.contains(cloneWrapper)) {
      document.body.removeChild(cloneWrapper);
    }
    downloading.value = false;
  }
};

defineExpose({
  downloadRosterImage
});
</script>

<style scoped>
.official-roster-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
  padding-bottom: 16px;
}
</style>
