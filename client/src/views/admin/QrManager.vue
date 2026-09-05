<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-base font-bold text-gray-900">动态活码管理控制台</h3>
        <p class="text-xs text-gray-500 mt-0.5">二维码生成后可永久使用，后台随时切换绑定的试卷、随时开启/停用考试</p>
      </div>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon class="mr-1"><Plus /></el-icon>
        新建动态活码
      </el-button>
    </div>

    <!-- 活码卡片列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" v-loading="loading">
      <div
        v-for="qr in qrList"
        :key="qr.id"
        class="bg-white rounded-xl p-5 shadow-sm border border-gray-200 flex flex-col justify-between space-y-4 hover:shadow-md transition"
      >
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-gray-900 text-base flex items-center gap-2">
              {{ qr.title }}
              <el-tag :type="qr.isActive ? 'success' : 'info'" size="small">
                {{ qr.isActive ? '运行中' : '已停用' }}
              </el-tag>
            </h4>
            <div class="text-xs text-gray-400 mt-1">扫码计数: {{ qr.scanCount }} 次</div>
          </div>
          <el-button type="danger" icon="Delete" circle size="small" plain @click="deleteQr(qr.id)" />
        </div>

        <!-- 关联的试卷信息与重定向选择 -->
        <div class="bg-gray-50 p-3 rounded-lg space-y-2">
          <label class="block text-xs font-semibold text-gray-500">当前重定向绑定的在线试卷:</label>
          <el-select v-model="qr.examId" size="small" class="w-full" @change="updateQrExam(qr)">
            <el-option
              v-for="exam in examOptions"
              :key="exam.id"
              :label="exam.title + ' (分值:' + exam.totalScore + '分)'"
              :value="exam.id"
            />
          </el-select>
        </div>

        <!-- 二维码渲染与操作区域 -->
        <div class="flex items-center gap-4 pt-2 border-t">
          <div class="p-2 bg-white rounded-lg border shadow-inner shrink-0" :id="'qr-canvas-' + qr.id">
            <qrcode-vue :value="getScanUrl(qr.codeKey)" :size="100" level="H" />
          </div>

          <div class="flex-1 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">活码控制开关:</span>
              <el-switch v-model="qr.isActive" @change="updateQrStatus(qr)" />
            </div>

            <el-button size="small" type="primary" plain class="w-full" @click="copyScanUrl(qr.codeKey)">
              <el-icon class="mr-1"><CopyDocument /></el-icon>
              复制 H5 答题链接
            </el-button>

            <el-button size="small" type="success" plain class="w-full" @click="openH5Preview(qr.codeKey)">
              <el-icon class="mr-1"><View /></el-icon>
              模拟 H5 答题
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建活码对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建动态活码" width="450px">
      <el-form :model="newQrForm" label-position="top">
        <el-form-item label="活码名称" required>
          <el-input v-model="newQrForm.title" placeholder="例如：2026年终技能考核活码" />
        </el-form-item>

        <el-form-item label="初始关联试卷" required>
          <el-select v-model="newQrForm.examId" class="w-full" placeholder="请选择关联的试卷">
            <el-option
              v-for="exam in examOptions"
              :key="exam.id"
              :label="exam.title"
              :value="exam.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createQr">创建活码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../../utils/api';

const qrList = ref([]);
const examOptions = ref([]);
const loading = ref(false);
const showCreateDialog = ref(false);

const newQrForm = reactive({
  title: '',
  examId: ''
});

const getScanUrl = (codeKey) => {
  return `${window.location.origin}/exam/${codeKey}`;
};

const fetchData = async () => {
  loading.value = true;
  try {
    const [qrRes, examRes] = await Promise.all([
      api.get('/qr'),
      api.get('/exams')
    ]);
    if (qrRes.data.success) qrList.value = qrRes.data.data;
    if (examRes.data.success) examOptions.value = examRes.data.data;
  } catch (err) {
    ElMessage.error('获取活码数据失败');
  } finally {
    loading.value = false;
  }
};

const createQr = async () => {
  if (!newQrForm.title || !newQrForm.examId) {
    return ElMessage.warning('请填写活码名称并选择关联试卷');
  }

  try {
    const res = await api.post('/qr', newQrForm);
    if (res.data.success) {
      ElMessage.success('动态活码创建成功！');
      showCreateDialog.value = false;
      newQrForm.title = '';
      newQrForm.examId = '';
      fetchData();
    }
  } catch (err) {
    ElMessage.error('创建失败');
  }
};

const updateQrExam = async (qr) => {
  try {
    await api.put(`/qr/${qr.id}`, { examId: qr.examId });
    ElMessage.success('已即时更新活码关联的试卷！');
  } catch (err) {
    ElMessage.error('关联调整失败');
  }
};

const updateQrStatus = async (qr) => {
  try {
    await api.put(`/qr/${qr.id}`, { isActive: qr.isActive });
    ElMessage.success(`活码已 ${qr.isActive ? '开启' : '停用'}`);
  } catch (err) {
    ElMessage.error('状态更新失败');
  }
};

const deleteQr = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除此活码吗？删除后已打印的二维码将失效。', '删除警告', {
      type: 'warning'
    });
    await api.delete(`/qr/${id}`);
    ElMessage.success('活码删除成功');
    fetchData();
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('删除失败');
  }
};

const copyScanUrl = (codeKey) => {
  const url = getScanUrl(codeKey);
  navigator.clipboard.writeText(url);
  ElMessage.success('答题链接已复制到剪贴板！');
};

const openH5Preview = (codeKey) => {
  window.open(getScanUrl(codeKey), '_blank');
};

onMounted(fetchData);
</script>
