<template>
  <div class="min-h-screen flex bg-gray-100">
    <!-- 侧边栏导航 -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col shadow-lg shrink-0">
      <div class="p-5 flex items-center gap-3 border-b border-slate-800">
        <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow">
          AI
        </div>
        <div>
          <h1 class="font-bold text-base leading-snug">{{ platformName }}</h1>
          <p class="text-xs text-slate-400">
            {{ isDeveloper ? '👑 超级开发者模式' : '创作者工作台' }}
          </p>
        </div>
      </div>

      <!-- 用户信息卡片（已登录时） -->
      <div v-if="currentUser" class="mx-3 my-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <div class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
            {{ isDeveloper ? 'Dev' : 'VIP' }}
          </div>
          <div class="truncate">
            <div class="text-xs font-bold truncate">{{ currentUser.nickname }}</div>
            <div class="text-[10px] text-slate-400">
              <span v-if="isDeveloper" class="text-red-400 font-bold">全站管理权限</span>
              <span v-else-if="currentUser.isVip" class="text-amber-400 font-bold">👑 VIP 会员</span>
              <span v-else class="text-blue-300">免费额度: {{ currentUser.freeQuota }}次</span>
            </div>
          </div>
        </div>
        <button v-if="!isDeveloper && !currentUser.isVip" class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 text-[10px] font-bold rounded-md" @click="openPayModal">
          升级VIP
        </button>
      </div>

      <nav class="flex-1 p-3 space-y-1">
        <router-link
          to="/admin/ai-generate"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
          :class="$route.name === 'AiGenerate' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'"
        >
          <el-icon><MagicStick /></el-icon>
          AI 智能出题
        </router-link>

        <router-link
          to="/admin/exams"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
          :class="['ExamList', 'ExamEditor'].includes($route.name) ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'"
        >
          <el-icon><Document /></el-icon>
          {{ isDeveloper ? '全站试卷库管理' : '我的试卷库' }}
        </router-link>

        <router-link
          to="/admin/qr-manager"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
          :class="$route.name === 'QrManager' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'"
        >
          <el-icon><FullScreen /></el-icon>
          {{ isDeveloper ? '全站活码管理' : '我的二维码活码' }}
        </router-link>

        <!-- 开发者专属菜单 -->
        <template v-if="isDeveloper">
          <div class="pt-3 pb-1 px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            开发者管理专区
          </div>

          <router-link
            to="/admin/developer"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            :class="$route.name === 'DeveloperCenter' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-300 hover:bg-slate-800'"
          >
            <el-icon><DataAnalysis /></el-icon>
            变现中心与订单收入
          </router-link>

          <router-link
            to="/admin/settings"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            :class="$route.name === 'Settings' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'"
          >
            <el-icon><Setting /></el-icon>
            平台品牌与支付设置
          </router-link>
        </template>

        <!-- 普通用户开通 VIP 入口 -->
        <template v-else>
          <div class="pt-4 px-1">
            <button
              class="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
              @click="openPayModal"
            >
              <span>👑</span>
              <span>{{ currentUser?.isVip ? 'VIP 会员权益特权' : '立即解锁 VIP 无限出题' }}</span>
            </button>
          </div>
        </template>
      </nav>

      <div class="p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <span class="truncate">搬瓦工 7×24h 在线</span>
        <button v-if="currentUser" class="text-red-400 hover:underline" @click="handleLogout">退出</button>
      </div>
    </aside>

    <!-- 右侧主内容区域 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 顶部 Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-bold text-gray-800">
            {{ $route.meta.title || '后台管理系统' }}
          </h2>
          <el-tag v-if="isDeveloper" type="danger" effect="plain" class="rounded-full">开发者模式</el-tag>
          <el-tag v-else-if="currentUser?.isVip" type="warning" effect="plain" class="rounded-full">👑 VIP 创作者</el-tag>
        </div>

        <div class="flex items-center gap-3">
          <!-- 登录/状态控制 -->
          <div v-if="!currentUser">
            <el-button type="success" size="small" class="font-bold shadow-sm" @click="openLoginModal">
              微信扫码登录 / 开发者
            </el-button>
          </div>

          <div v-else class="flex items-center gap-2">
            <span class="text-xs text-gray-600">{{ currentUser.nickname }}</span>
            <el-button v-if="!isDeveloper && !currentUser.isVip" type="warning" size="small" plain @click="openPayModal">
              升级 VIP
            </el-button>
          </div>

          <el-button type="primary" size="small" plain @click="$router.push('/admin/ai-generate')">
            + 快速出题
          </el-button>
        </div>
      </header>

      <!-- 页面内容槽 -->
      <main class="flex-1 p-6 overflow-y-auto">
        <router-view />
      </main>
    </div>

    <!-- 弹窗挂载 -->
    <WeChatLoginModal ref="loginModalRef" @login-success="onLoginSuccess" />
    <PayVipModal ref="payModalRef" @pay-success="onPaySuccess" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../../utils/api';
import WeChatLoginModal from '../../components/WeChatLoginModal.vue';
import PayVipModal from '../../components/PayVipModal.vue';

const platformName = ref('AI 智能考试平台');
const currentUser = ref(null);
const loginModalRef = ref(null);
const payModalRef = ref(null);

const isDeveloper = computed(() => {
  return currentUser.value && currentUser.value.role === 'developer';
});

const fetchCurrentUser = async () => {
  try {
    const res = await api.get('/auth/me');
    if (res.data.success && res.data.data) {
      currentUser.value = res.data.data;
    } else {
      currentUser.value = null;
    }
  } catch (err) {
    currentUser.value = null;
  }
};

const openLoginModal = () => {
  loginModalRef.value?.open();
};

const openPayModal = () => {
  if (!currentUser.value) {
    ElMessage.warning('请先点击登录后再购买套餐！');
    loginModalRef.value?.open();
    return;
  }
  payModalRef.value?.open();
};

const onLoginSuccess = (user) => {
  currentUser.value = user;
  fetchCurrentUser();
};

const onPaySuccess = () => {
  fetchCurrentUser();
};

const handleLogout = () => {
  localStorage.removeItem('token');
  currentUser.value = null;
  ElMessage.info('已退出当前模式');
  window.location.reload();
};

onMounted(async () => {
  fetchCurrentUser();
  try {
    const res = await api.get('/config');
    if (res.data.success && res.data.data.platformName) {
      platformName.value = res.data.data.platformName;
    }
  } catch (err) {}
});
</script>
