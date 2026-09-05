<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-base font-bold text-gray-800">全部试卷库 ({{ exams.length }})</h3>
      <el-button type="primary" @click="$router.push('/admin/ai-generate')">
        <el-icon class="mr-1"><MagicStick /></el-icon>
        AI 智能出题
      </el-button>
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

        <el-table-column label="操作" width="280" align="right">
          <template #default="{ row }">
            <div class="flex justify-end gap-2">
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../../utils/api';

const exams = ref([]);
const loading = ref(false);

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
