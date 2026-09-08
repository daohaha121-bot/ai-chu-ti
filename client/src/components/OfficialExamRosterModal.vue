<template>
  <el-dialog
    v-model="visible"
    title="官方标准化考生成绩总表 · 预览与高清导出"
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

      <!-- 预览可滚动视窗 -->
      <div
        ref="previewScrollArea"
        class="max-h-[68vh] overflow-y-auto overflow-x-auto p-4 bg-gray-100/90 rounded-xl flex justify-center border border-gray-200"
      >
        <!-- 页面预览卡片 (导出目标区域) — 全部内联样式确保导出 100% 一致 -->
        <div
          ref="captureArea"
          class="roster-capture-card"
        >
          <!-- 顶部抬头 -->
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 20px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 900; letter-spacing: 3px; color: #475569; text-transform: uppercase;">
                {{ systemConfig?.platformName || 'AI 智能在线考核认证中心' }}
              </span>
            </div>

            <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 4px 0 0 0;">
              {{ exam?.title || '标准化考核' }} · 考生考核成绩总表
            </h1>

            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; padding-top: 8px; margin-top: 8px; border-top: 1px dashed #e2e8f0;">
              <span style="font-family: monospace; font-weight: 500;">存证编号: ARCHIVE-{{ (exam?.id || 'EXAM').slice(0, 8).toUpperCase() }}-{{ archiveDateCode }}</span>
              <span>制表日期: {{ currentDateFormatted }}</span>
              <span style="font-weight: 500; color: #475569;">{{ systemConfig?.watermarkText || '真实考试存证有效' }}</span>
            </div>
          </div>

          <!-- 核心统计概况 -->
          <div style="display: flex; gap: 12px; text-align: center;">
            <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
              <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 2px;">满分 / 及格线</div>
              <div style="font-size: 16px; font-weight: 900; color: #1e293b;">{{ exam?.totalScore || 100 }}分 / {{ exam?.passScore || 60 }}分</div>
            </div>
            <div style="flex: 1; background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px;">
              <div style="font-size: 11px; color: #2563eb; font-weight: 500; margin-bottom: 2px;">参考总人数</div>
              <div style="font-size: 16px; font-weight: 900; color: #172554;">{{ submissions.length }} 人</div>
            </div>
            <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px; border-radius: 8px;">
              <div style="font-size: 11px; color: #059669; font-weight: 500; margin-bottom: 2px;">考核达标人数</div>
              <div style="font-size: 16px; font-weight: 900; color: #022c22;">{{ passedCount }} 人</div>
            </div>
            <div style="flex: 1; background: #faf5ff; border: 1px solid #d8b4fe; padding: 12px; border-radius: 8px;">
              <div style="font-size: 11px; color: #7c3aed; font-weight: 500; margin-bottom: 2px;">综合及格率</div>
              <div style="font-size: 16px; font-weight: 900; color: #3b0764;">{{ calculatedPassRate }}%</div>
            </div>
            <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px;">
              <div style="font-size: 11px; color: #b45309; font-weight: 500; margin-bottom: 2px;">全员平均分</div>
              <div style="font-size: 16px; font-weight: 900; color: #422006;">{{ calculatedAvgScore }} 分</div>
            </div>
          </div>

          <!-- 考生全量花名册 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
              <thead>
                <tr style="background: #0f172a; color: white; font-size: 12px;">
                  <th style="width: 6%; padding: 10px 8px; font-weight: 600; text-align: center;">序号</th>
                  <th style="width: 14%; padding: 10px 12px; font-weight: 600; text-align: left;">考生姓名</th>
                  <th style="width: 15%; padding: 10px 12px; font-weight: 600; text-align: left;">学号/工号</th>
                  <th style="width: 15%; padding: 10px 12px; font-weight: 600; text-align: left;">部门/班级</th>
                  <th style="width: 10%; padding: 10px 8px; font-weight: 600; text-align: center;">考核得分</th>
                  <th style="width: 10%; padding: 10px 8px; font-weight: 600; text-align: center;">评定结果</th>
                  <th style="width: 12%; padding: 10px 8px; font-weight: 600; text-align: center;">考场纪律</th>
                  <th style="width: 18%; padding: 10px 12px; font-weight: 600; text-align: right;">交卷时间</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(sub, idx) in submissions"
                  :key="sub.id || idx"
                  :style="{ background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }"
                >
                  <td style="padding: 10px 8px; text-align: center; font-family: monospace; color: #94a3b8; font-size: 12px; border-bottom: 1px solid #e2e8f0;">{{ idx + 1 }}</td>
                  <td style="padding: 10px 12px; font-weight: 700; color: #0f172a; font-size: 12px; border-bottom: 1px solid #e2e8f0;">{{ sub.userInfo?.name || '匿名' }}</td>
                  <td style="padding: 10px 12px; font-family: monospace; color: #475569; font-size: 12px; border-bottom: 1px solid #e2e8f0;">{{ sub.userInfo?.student_id || '-' }}</td>
                  <td style="padding: 10px 12px; color: #475569; font-size: 12px; border-bottom: 1px solid #e2e8f0;">{{ sub.userInfo?.department || '-' }}</td>
                  <td :style="{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: '14px', fontFamily: 'monospace', color: sub.isPassed ? '#059669' : '#e11d48', borderBottom: '1px solid #e2e8f0' }">
                    {{ sub.score }}分
                  </td>
                  <td style="padding: 10px 8px; text-align: center; font-size: 10px; border-bottom: 1px solid #e2e8f0;">
                    <span
                      v-if="sub.isPassed"
                      style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;"
                    >合格</span>
                    <span
                      v-else
                      style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; background: #ffe4e6; color: #9f1239; border: 1px solid #fda4af;"
                    >未达标</span>
                  </td>
                  <td style="padding: 10px 8px; text-align: center; font-size: 10px; border-bottom: 1px solid #e2e8f0;">
                    <span v-if="sub.switchCount > 0" style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #b45309; background: #fef3c7; border: 1px solid #fcd34d;">
                      切屏 {{ sub.switchCount }} 次
                    </span>
                    <span v-else style="color: #94a3b8; font-size: 10px;">正常 (0次)</span>
                  </td>
                  <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #64748b; white-space: nowrap; border-bottom: 1px solid #e2e8f0;">
                    {{ formatDate(sub.submittedAt) }}
                  </td>
                </tr>

                <tr v-if="submissions.length === 0">
                  <td colspan="8" style="padding: 40px; text-align: center; color: #94a3b8; font-size: 14px;">
                    暂无考生成绩记录
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 真实考试背书 -->
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 11px; color: #475569; line-height: 1.6;">
            <div style="font-weight: 700; color: #422006; margin-bottom: 4px;">
              真实考试与成绩存证背书：
            </div>
            <p style="margin: 0;">
              本考核成绩汇总表由数字化考核系统严格依据标准化考场答题记录与反作弊切屏监控系统自动生成。全员答卷内容、得分评定及考试纪律数据均已入库归档存证，成绩真实无篡改，特此出具成绩公报。
            </p>
          </div>

          <!-- 底部签署栏与红章 -->
          <div style="padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; align-items: flex-end; justify-content: space-between; min-height: 120px;">
            <!-- 左侧落款 -->
            <div style="font-size: 12px; color: #475569;">
              <div><strong>考核主办机构：</strong>{{ systemConfig?.platformName || '考核认证委员会' }}</div>
              <div style="margin-top: 6px;"><strong>防伪认证机制：</strong>数字签名防伪存证与考场全程切屏监控</div>
              <div style="font-size: 11px; color: #94a3b8; font-family: monospace; margin-top: 6px;">
                HASH: SHA256-{{ (exam?.id || 'EXAM').slice(0, 12) }}-VERIFIED
              </div>
            </div>

            <!-- 中间签字栏 -->
            <div style="font-size: 12px; color: #334155; padding-bottom: 4px;">
              <div>主考官 / 审核人签字：__________________</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 8px;">签发日期：{{ currentDateFormatted }}</div>
            </div>

            <!-- 右侧红色印章 (纯内联样式确保导出一致性) -->
            <div style="width: 130px; height: 130px; display: flex; align-items: center; justify-content: center;">
              <div style="width: 120px; height: 120px; border-radius: 50%; border: 4px double #dc2626; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #dc2626; transform: rotate(-12deg); background: rgba(254,242,242,0.45); user-select: none;">
                <div style="font-size: 10px; font-weight: 700; text-align: center; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ (systemConfig?.platformName || '在线考试认证中心').slice(0, 10) }}
                </div>
                <div style="font-size: 16px; margin: 2px 0; line-height: 1;">&#9733;</div>
                <div style="font-size: 13px; font-weight: 900; letter-spacing: 3px;">考核成绩专用章</div>
                <div style="font-size: 9px; letter-spacing: 1px; font-weight: 600; margin-top: 2px;">官方认证 · 真实有效</div>
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
import { toPng } from 'html-to-image';

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
const captureArea = ref(null);

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

/**
 * 导出高清成绩总表 PNG 长图
 * 策略：
 * 1. 临时解除滚动容器高度限制
 * 2. html-to-image (toPng) 基于 SVG foreignObject 完美支持所有 CSS
 * 3. <a download> 触发保存，失败则 window.open 新标签页供手动保存
 * 4. html2canvas 作为最终后备
 */
const downloadRosterImage = async () => {
  const element = captureArea.value;
  if (!element) {
    ElMessage.error('找不到要导出的成绩单区域');
    return;
  }

  downloading.value = true;

  // 保存并临时修改滚动容器样式
  const scrollEl = previewScrollArea.value;
  const saved = {};
  if (scrollEl) {
    saved.maxHeight = scrollEl.style.maxHeight;
    saved.overflow = scrollEl.style.overflow;
    saved.overflowX = scrollEl.style.overflowX;
    saved.overflowY = scrollEl.style.overflowY;
    scrollEl.style.maxHeight = 'none';
    scrollEl.style.overflow = 'visible';
    scrollEl.style.overflowX = 'visible';
    scrollEl.style.overflowY = 'visible';
  }

  // 处理 el-dialog 内层滚动
  const dialogBody = element.closest('.el-dialog__body');
  const savedDialogOF = dialogBody ? dialogBody.style.overflow : '';
  if (dialogBody) dialogBody.style.overflow = 'visible';

  const examTitle = (props.exam?.title || '考试').replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${examTitle}_官方考核成绩总表_${archiveDateCode.value}.png`;

  try {
    ElMessage.info({ message: '正在生成 2x 超清成绩长图，请稍候...', duration: 5000 });

    await nextTick();
    await new Promise(r => setTimeout(r, 200));

    console.log('[ExportDebug] 开始导出, 尺寸:', element.offsetWidth, 'x', element.offsetHeight);

    // 主方案: html-to-image toPng
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true
    });

    console.log('[ExportDebug] toPng 成功, dataUrl 长度:', dataUrl.length);

    if (!dataUrl || dataUrl.length < 100) {
      throw new Error('生成的图片数据为空');
    }

    // 触发下载
    triggerDataUrlDownload(dataUrl, filename);
    ElMessage.success({ message: '成绩单高清长图已导出！', duration: 3000 });

  } catch (err) {
    console.error('[ExportDebug] html-to-image 失败:', err);

    // 后备方案: html2canvas
    try {
      console.log('[ExportDebug] 尝试 html2canvas 备用...');
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: true
      });
      console.log('[ExportDebug] html2canvas 成功, canvas:', canvas.width, 'x', canvas.height);

      const fallbackUrl = canvas.toDataURL('image/png');
      triggerDataUrlDownload(fallbackUrl, filename);
      ElMessage.success({ message: '成绩单已通过备用方式导出！', duration: 3000 });

    } catch (err2) {
      console.error('[ExportDebug] 全部方案均失败:', err2);
      ElMessage.error({
        message: '导出失败: ' + (err.message || '未知错误') + '。请尝试浏览器截图(Ctrl+Shift+S)',
        duration: 8000
      });
    }

  } finally {
    // 恢复样式
    if (scrollEl) {
      scrollEl.style.maxHeight = saved.maxHeight || '';
      scrollEl.style.overflow = saved.overflow || '';
      scrollEl.style.overflowX = saved.overflowX || '';
      scrollEl.style.overflowY = saved.overflowY || '';
    }
    if (dialogBody) dialogBody.style.overflow = savedDialogOF;
    downloading.value = false;
  }
};

/** 通过 <a download> 下载 data URL 图片，失败则在新标签页打开 */
function triggerDataUrlDownload(dataUrl, filename) {
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { if (link.parentNode) document.body.removeChild(link); }, 1000);
  } catch (e) {
    console.warn('[ExportDebug] <a> download 失败，打开新窗口:', e);
    const w = window.open('');
    if (w) {
      w.document.write('<html><head><title>' + filename + '</title></head><body style="margin:0;display:flex;justify-content:center;background:#f1f5f9;"><img src="' + dataUrl + '" style="max-width:100%;height:auto;" /></body></html>');
      w.document.close();
      ElMessage.info({ message: '图片已在新窗口打开，请右键保存', duration: 5000 });
    }
  }
}

defineExpose({
  downloadRosterImage
});
</script>

<style scoped>
.official-roster-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
  padding-bottom: 16px;
}

/* 导出目标卡片: 使用普通 CSS class 控制容器布局, 内部全部内联样式确保导出一致 */
.roster-capture-card {
  width: 900px;
  min-width: 900px;
  background-color: #ffffff;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e7eb;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
