<template>
  <div class="space-y-6" v-loading="loading">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <el-button @click="$router.push('/admin/exams')">← 返回试卷库</el-button>
        <h3 class="text-lg font-bold text-gray-900">答题数据统计分析与报表导出</h3>
      </div>

      <div class="flex items-center gap-2">
        <el-button type="success" plain @click="exportExcel">
          <el-icon class="mr-1"><Document /></el-icon>
          导出 Excel 成绩单
        </el-button>

        <el-button type="primary" plain @click="openRosterModal">
          <el-icon class="mr-1"><Picture /></el-icon>
          导出成绩单高清图片 (PNG)
        </el-button>
      </div>
    </div>

    <!-- 具备平台标识的可导出统计区域 -->
    <div id="analytics-report-area" class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
      <!-- 平台品牌 Header 标识 -->
      <div class="flex items-center justify-between border-b pb-4">
        <div class="flex items-center gap-3">
          <img v-if="systemConfig.logoUrl" :src="systemConfig.logoUrl" class="h-8 w-auto" />
          <div>
            <h2 class="text-xl font-black text-gray-900 tracking-tight">{{ systemConfig.platformName || 'AI 智能考试平台' }}</h2>
            <p class="text-xs text-gray-400">考试成绩汇总与全维度错题率分析报告</p>
          </div>
        </div>
        <div class="text-right text-xs text-gray-400">
          <div>报表生成时间: {{ new Date().toLocaleDateString() }}</div>
          <div class="font-medium text-gray-600">{{ systemConfig.watermarkText }}</div>
        </div>
      </div>

      <!-- 核心数据看板 -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-blue-50 p-4 rounded-xl text-center">
          <div class="text-xs text-blue-600 font-semibold mb-1">交卷总人数</div>
          <div class="text-2xl font-black text-blue-900">{{ analytics.totalSubmissions || 0 }} <span class="text-xs font-normal">人</span></div>
        </div>

        <div class="bg-indigo-50 p-4 rounded-xl text-center">
          <div class="text-xs text-indigo-600 font-semibold mb-1">全员平均分</div>
          <div class="text-2xl font-black text-indigo-900">{{ analytics.avgScore || 0 }} <span class="text-xs font-normal">分</span></div>
        </div>

        <div class="bg-emerald-50 p-4 rounded-xl text-center">
          <div class="text-xs text-emerald-600 font-semibold mb-1">最高分 / 最低分</div>
          <div class="text-xl font-black text-emerald-900">{{ analytics.maxScore || 0 }} / {{ analytics.minScore || 0 }}</div>
        </div>

        <div class="bg-purple-50 p-4 rounded-xl text-center">
          <div class="text-xs text-purple-600 font-semibold mb-1">考试合格率</div>
          <div class="text-2xl font-black text-purple-900">{{ analytics.passRate || 0 }}%</div>
        </div>

        <div class="bg-amber-50 p-4 rounded-xl text-center">
          <div class="text-xs text-amber-600 font-semibold mb-1">平台水印防伪</div>
          <div class="text-xs font-bold text-amber-900 mt-2 truncate">{{ systemConfig.watermarkText || '合规测试认证' }}</div>
        </div>
      </div>

      <!-- 各题错题率分布与分析 -->
      <div class="space-y-4 pt-2">
        <h4 class="font-bold text-base text-gray-800 flex items-center gap-2">
          <el-icon class="text-blue-600"><Histogram /></el-icon>
          各题错题率与正确率分布
        </h4>

        <div class="space-y-3">
          <div v-for="(q, idx) in analytics.questionAnalytics" :key="q.id" class="bg-gray-50 p-4 rounded-xl space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="font-bold text-gray-800">第 {{ idx + 1 }} 题: {{ q.stem }}</span>
              <span class="text-xs font-semibold text-red-500">错题率: {{ q.errorRate }}% (错 {{ q.errorCount }} 人 / 答对 {{ q.correctCount }} 人)</span>
            </div>
            <div class="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
              <div class="bg-green-500 h-full transition-all" :style="{ width: q.correctRate + '%' }" title="正确率"></div>
              <div class="bg-red-500 h-full transition-all" :style="{ width: q.errorRate + '%' }" title="错题率"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 考生交卷明细列表 -->
      <div class="space-y-3 pt-2">
        <h4 class="font-bold text-base text-gray-800">考生成绩提交明细列表</h4>
        <el-table :data="submissions" stripe style="width: 100%">
          <el-table-column label="考生身份" min-width="150">
            <template #default="{ row }">
              <div class="font-bold text-gray-900">{{ row.userInfo?.name || '匿名' }}</div>
              <div class="text-xs text-gray-400">学号/工号: {{ row.userInfo?.student_id || '-' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="部门/班级" min-width="120">
            <template #default="{ row }">
              <span class="text-xs text-gray-600">{{ row.userInfo?.department || '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="得分" width="100" align="center">
            <template #default="{ row }">
              <span class="font-bold text-base" :class="row.isPassed ? 'text-green-600' : 'text-red-500'">
                {{ row.score }} 分
              </span>
            </template>
          </el-table-column>

          <el-table-column label="切屏作弊监控" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="row.switchCount > 0 ? 'warning' : 'info'" size="small">
                切屏 {{ row.switchCount }} 次
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="交卷时间" width="160">
            <template #default="{ row }">
              <span class="text-xs text-gray-500">{{ new Date(row.submittedAt).toLocaleString() }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" align="center" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-center gap-2">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="openCertModal(row)"
                >
                  📜 成绩证明单
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  @click="deleteSubmission(row)"
                >
                  🗑️ 删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 考生官方成绩证明单卡片导出弹窗 -->
    <CandidateCertModal
      v-model="showCertModal"
      :submission="selectedSubmission"
      :exam="examInfo"
      :system-config="systemConfig"
    />

    <!-- 官方标准化考生成绩总表长图导出弹窗 -->
    <OfficialExamRosterModal
      v-model="showRosterModal"
      :exam="examInfo"
      :submissions="submissions"
      :analytics="analytics"
      :system-config="systemConfig"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import CandidateCertModal from '@/components/CandidateCertModal.vue';
import OfficialExamRosterModal from '@/components/OfficialExamRosterModal.vue';

const route = useRoute();
const loading = ref(false);
const analytics = ref({ questionAnalytics: [] });
const submissions = ref([]);
const examInfo = ref({});

// 官方成绩总表长图导出弹窗
const showRosterModal = ref(false);
const openRosterModal = () => {
  showRosterModal.value = true;
};

// 成绩证明单弹窗控制
const showCertModal = ref(false);
const selectedSubmission = ref(null);

const systemConfig = reactive({
  platformName: 'AI 智能考试平台',
  logoUrl: '',
  watermarkText: 'AI 考试系统版权所有'
});

const fetchData = async () => {
  loading.value = true;
  try {
    const [anaRes, subRes, cfgRes, examRes] = await Promise.all([
      axios.get(`/api/submissions/analytics/${route.params.examId}`),
      axios.get(`/api/submissions/exam/${route.params.examId}`),
      axios.get('/api/config'),
      axios.get(`/api/exams/${route.params.examId}`)
    ]);

    if (anaRes.data.success) analytics.value = anaRes.data.data;
    if (subRes.data.success) submissions.value = subRes.data.data;
    if (cfgRes.data.success) Object.assign(systemConfig, cfgRes.data.data);
    if (examRes.data.success) examInfo.value = examRes.data.data;
  } catch (err) {
    ElMessage.error('获取统计报表数据失败');
  } finally {
    loading.value = false;
  }
};

const openCertModal = (submission) => {
  selectedSubmission.value = submission;
  showCertModal.value = true;
};

const deleteSubmission = async (submission) => {
  const candidateName = submission.userInfo?.name || '该考生';
  try {
    await ElMessageBox.confirm(
      `确定要删除考生【${candidateName}】的本次成绩记录吗？\n删除后该考生在答题限制规则下的提交次数将被清空/减少，可重新扫码答题，此操作不可逆！`,
      '警告 · 删除考生成绩记录',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    );

    const res = await axios.delete(`/api/submissions/${submission.id}`);
    if (res.data.success) {
      ElMessage.success('成绩记录已删除，该考生答题资格已恢复');
      fetchData();
    } else {
      ElMessage.error(res.data.message || '删除失败');
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除操作失败: ' + (err.response?.data?.message || err.message));
    }
  }
};

const exportExcel = () => {
  window.open(`/api/submissions/export/excel/${route.params.examId}`, '_blank');
};

onMounted(fetchData);
</script>
