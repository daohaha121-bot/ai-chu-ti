<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-base font-bold text-gray-800">全部试卷库 ({{ exams.length }})</h3>
      <div class="flex items-center gap-3">
        <el-button type="success" plain @click="$router.push('/admin/import-bank')">
          <el-icon class="mr-1"><UploadFilled /></el-icon>
          直接上传题库
        </el-button>
        <el-button type="primary" @click="$router.push('/admin/ai-generate')">
          <el-icon class="mr-1"><MagicStick /></el-icon>
          AI 智能出题
        </el-button>
      </div>
    </div>

    <el-card class="shadow-sm border-0 rounded-xl">
      <el-table :data="exams" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="title" label="试卷名称" min-width="180">
          <template #default="{ row }">
            <div class="font-bold text-gray-900">{{ row.title }}</div>
            <div class="text-xs text-gray-400 mt-0.5">{{ row.description || '无描述' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="题目数 / 总分" width="130" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row._count?.questions || 0 }} 题</el-tag>
            <div class="text-xs text-gray-500 mt-1">满分 {{ row.totalScore }} 分</div>
          </template>
        </el-table-column>

        <el-table-column label="交卷人数" width="110" align="center">
          <template #default="{ row }">
            <span class="font-semibold text-blue-600">{{ row._count?.submissions || 0 }} 人</span>
          </template>
        </el-table-column>

        <el-table-column label="试卷状态" width="110" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              active-value="active"
              inactive-value="closed"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="340" align="right">
          <template #default="{ row }">
            <div class="flex justify-end gap-1.5">
              <el-button size="small" type="warning" plain @click="openExamQr(row)">
                <el-icon class="mr-0.5"><FullScreen /></el-icon>
                二维码
              </el-button>
              <el-button size="small" type="primary" plain @click="$router.push(`/admin/exam-editor/${row.id}`)">
                编辑
              </el-button>
              <el-button size="small" type="success" plain @click="$router.push(`/admin/analytics/${row.id}`)">
                统计分析
              </el-button>
              <el-button size="small" type="danger" plain @click="deleteExam(row.id)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 试卷二维码弹窗 -->
    <el-dialog v-model="showQrDialog" :title="'📱 ' + (currentQrExam?.title || '') + ' - 专属答题二维码'" width="480px" center>
      <div class="text-center py-2 space-y-4" v-loading="qrLoading">
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-sm mx-auto flex flex-col items-center shadow-inner space-y-3">
          <div class="bg-white p-3 rounded-xl border shadow-sm" id="exam-list-qr-box">
            <qrcode-vue v-if="currentQrCode" :value="getScanUrl(currentQrCode.codeKey)" :size="160" level="H" />
          </div>
          <div class="text-xs text-slate-500 font-medium">微信或手机扫码即答</div>

          <div class="w-full flex items-center gap-2">
            <el-input :model-value="getScanUrl(currentQrCode?.codeKey)" readonly size="small" />
            <el-button size="small" type="primary" plain @click="copyScanUrl(currentQrCode?.codeKey)">
              复制链接
            </el-button>
          </div>

          <div class="flex items-center gap-2 w-full">
            <el-button size="small" type="success" plain class="flex-1" @click="openH5Preview(currentQrCode?.codeKey)">
              <el-icon class="mr-1"><View /></el-icon>
              模拟答题
            </el-button>
            <el-button size="small" type="primary" plain class="flex-1" @click="downloadQrCode('exam-list-qr-box', currentQrExam?.title)">
              <el-icon class="mr-1"><Download /></el-icon>
              下载图片
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import QrcodeVue from 'qrcode.vue';
import api from '../../utils/api';

const exams = ref([]);
const loading = ref(false);

const showQrDialog = ref(false);
const currentQrExam = ref(null);
const currentQrCode = ref(null);
const qrLoading = ref(false);

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

const openExamQr = async (row) => {
  currentQrExam.value = row;
  showQrDialog.value = true;
  qrLoading.value = true;
  currentQrCode.value = null;

  try {
    const res = await api.get(`/qr/by-exam/${row.id}`);
    if (res.data.success && res.data.data) {
      currentQrCode.value = res.data.data;
    } else {
      ElMessage.error(res.data.message || '获取二维码失败');
    }
  } catch (err) {
    ElMessage.error('获取试卷二维码失败');
  } finally {
    qrLoading.value = false;
  }
};

const fetchExams = async () => {
  loading.value = true;
  try {
    const res = await api.get('/exams');
    if (res.data.success) {
      exams.value = res.data.data;
    }
  } catch (err) {
    ElMessage.error('获取试卷列表失败');
  } finally {
    loading.value = false;
  }
};

const handleStatusChange = async (row) => {
  try {
    await api.put(`/exams/${row.id}`, { status: row.status });
    ElMessage.success(`试卷已切换为 ${row.status === 'active' ? '开启' : '关闭'}`);
  } catch (err) {
    ElMessage.error('状态更新失败');
  }
};

const deleteExam = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这份试卷及其所有答题记录吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    });
    await api.delete(`/exams/${id}`);
    ElMessage.success('删除成功');
    fetchExams();
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('删除失败');
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN', { hour12: false });
};

onMounted(fetchExams);
</script>
