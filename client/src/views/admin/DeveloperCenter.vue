<template>
  <div class="space-y-6" v-loading="loading">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-black text-gray-900 flex items-center gap-2">
          <span>🛠️ 开发者变现中心 & 超级管理控制台</span>
          <el-tag type="danger" effect="dark" class="font-bold">仅开发者可见</el-tag>
        </h2>
        <p class="text-xs text-gray-500 mt-1">监控全平台变现流水订单、修改VIP套餐定价、管理创作者权限</p>
      </div>

      <el-button type="primary" plain @click="fetchData">
        <el-icon class="mr-1"><Refresh /></el-icon>
        刷新全站数据
      </el-button>
    </div>

    <!-- 1. 平台变现数据指标卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-lg">
        <div class="text-xs text-blue-100 font-semibold mb-1">全平台累计商业化总收入</div>
        <div class="text-3xl font-black tracking-tight">¥ {{ stats.totalRevenue || '0.00' }}</div>
        <div class="text-xs text-blue-200 mt-2 flex items-center gap-1">
          <span>💰 微信支付 / 真实流水统计</span>
        </div>
      </div>

      <div class="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-lg">
        <div class="text-xs text-emerald-100 font-semibold mb-1">全网付费完成订单</div>
        <div class="text-3xl font-black tracking-tight">{{ stats.totalOrders || 0 }} <span class="text-xs font-normal">单</span></div>
        <div class="text-xs text-emerald-200 mt-2">
          <span>📈 转化率与充值流水</span>
        </div>
      </div>

      <div class="bg-gradient-to-br from-purple-600 to-pink-700 text-white p-5 rounded-2xl shadow-lg">
        <div class="text-xs text-purple-100 font-semibold mb-1">活跃 VIP 创作者会员</div>
        <div class="text-3xl font-black tracking-tight">{{ stats.vipUsersCount || 0 }} <span class="text-xs font-normal">人</span></div>
        <div class="text-xs text-purple-200 mt-2">
          <span>👑 高粘性付费客户</span>
        </div>
      </div>
    </div>

    <!-- 2. 变现套餐定价策略编辑器 -->
    <el-card class="shadow-sm border-0 rounded-2xl">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-bold text-gray-800 text-base flex items-center gap-2">
            <el-icon class="text-amber-500"><Wallet /></el-icon>
            VIP 会员与变现套餐定价策略设置
          </div>
          <el-button type="success" size="small" :loading="savingPlans" @click="savePlans">
            保存套餐设置并同步全网
          </el-button>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="(plan, idx) in plans" :key="idx" class="p-4 bg-gray-50 rounded-xl border space-y-3">
          <div class="font-bold text-sm text-gray-900 border-b pb-2 flex justify-between items-center">
            <span>{{ plan.name }}</span>
            <el-tag size="small" :type="plan.recommend ? 'danger' : 'info'">{{ plan.type }}</el-tag>
          </div>

          <el-form-item label="套餐名称" class="!mb-2">
            <el-input v-model="plan.name" size="small" />
          </el-form-item>

          <el-form-item label="售价 (元)" class="!mb-2">
            <el-input-number v-model="plan.price" :min="0.01" :step="1" size="small" class="w-full" />
          </el-form-item>

          <el-form-item label="套餐说明 / 权益" class="!mb-0">
            <el-input v-model="plan.desc" size="small" type="textarea" :rows="2" />
          </el-form-item>
        </div>
      </div>
    </el-card>

    <!-- 3. 最近付费流水明细与全站用户 -->
    <el-tabs type="border-card" class="rounded-2xl shadow-sm border-0">
      <el-tab-pane label="📜 实时付费订单流水">
        <el-table :data="stats.recentOrders" stripe style="width: 100%">
          <el-table-column prop="orderNo" label="订单号" min-width="180">
            <template #default="{ row }">
              <span class="font-mono text-xs font-bold text-gray-800">{{ row.orderNo }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="planName" label="购买套餐" min-width="140" />

          <el-table-column label="支付金额" width="120" align="center">
            <template #default="{ row }">
              <span class="font-bold text-red-500">¥ {{ row.amount }}</span>
            </template>
          </el-table-column>

          <el-table-column label="创作者用户" min-width="130">
            <template #default="{ row }">
              <span class="text-xs text-gray-600">{{ row.user?.nickname || '用户' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100" align="center">
            <template #default>
              <el-tag type="success" size="small">已完成</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="付款时间" width="160">
            <template #default="{ row }">
              <span class="text-xs text-gray-500">{{ new Date(row.paidAt || row.createdAt).toLocaleString() }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="👥 注册创作者与配额管理">
        <el-table :data="userList" stripe style="width: 100%">
          <el-table-column prop="nickname" label="创作者昵称" min-width="140">
            <template #default="{ row }">
              <span class="font-bold text-gray-800">{{ row.nickname }}</span>
              <el-tag v-if="row.role === 'developer'" size="small" type="danger" class="ml-2">开发者</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="VIP 会员状态" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isVip ? 'warning' : 'info'" size="small">
                {{ row.isVip ? '👑 VIP 会员' : '普通用户' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="剩余免费额度" width="120" align="center">
            <template #default="{ row }">
              <span class="font-bold text-blue-600">{{ row.isVip ? '无限' : row.freeQuota + ' 次' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="出题总试卷数" width="120" align="center">
            <template #default="{ row }">
              <span>{{ row._count?.exams || 0 }} 份</span>
            </template>
          </el-table-column>

          <el-table-column label="注册时间" width="160">
            <template #default="{ row }">
              <span class="text-xs text-gray-500">{{ new Date(row.createdAt).toLocaleDateString() }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../../utils/api';

const loading = ref(false);
const savingPlans = ref(false);
const stats = ref({ totalRevenue: 0, totalOrders: 0, vipUsersCount: 0, recentOrders: [] });
const userList = ref([]);
const plans = ref([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const [anaRes, userRes, planRes] = await Promise.all([
      api.get('/orders/analytics'),
      api.get('/auth/users'),
      api.get('/orders/plans')
    ]);

    if (anaRes.data.success) stats.value = anaRes.data.data;
    if (userRes.data.success) userList.value = userRes.data.data;
    if (planRes.data.success) plans.value = planRes.data.data;
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '获取开发者中心数据失败，请确认开发者身份');
  } finally {
    loading.value = false;
  }
};

const savePlans = async () => {
  savingPlans.value = true;
  try {
    const res = await api.put('/orders/plans', { plans: plans.value });
    if (res.data.success) {
      ElMessage.success('变现套餐与定价调整已生效！');
    }
  } catch (err) {
    ElMessage.error('保存失败');
  } finally {
    savingPlans.value = false;
  }
};

onMounted(fetchData);
</script>
