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
          <p class="text-xs text-slate-400">问卷星模式 · 活码考试系统</p>
        </div>
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
          试卷库与二次编辑
        </router-link>

        <router-link
          to="/admin/qr-manager"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
          :class="$route.name === 'QrManager' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'"
        >
          <el-icon><FullScreen /></el-icon>
          二维码活码管理
        </router-link>

        <router-link
          to="/admin/settings"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
          :class="$route.name === 'Settings' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'"
        >
          <el-icon><Setting /></el-icon>
          品牌标识与付费设置
        </router-link>
      </nav>

      <div class="p-4 border-t border-slate-800 text-xs text-slate-400 text-center">
        局域网运行部署版 v1.0.0
      </div>
    </aside>

    <!-- 右侧主内容区域 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 顶部 Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <h2 class="text-lg font-bold text-gray-800">
          {{ $route.meta.title || '后台管理系统' }}
        </h2>
        <div class="flex items-center gap-3">
          <el-tag type="success" effect="plain" class="rounded-full">局域网在线中</el-tag>
          <el-button type="primary" size="small" plain @click="$router.push('/admin/ai-generate')">
            + 快速 AI 出题
          </el-button>
        </div>
      </header>

      <!-- 页面内容槽 -->
      <main class="flex-1 p-6 overflow-y-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const platformName = ref('AI 智能考试平台');

onMounted(async () => {
  try {
    const res = await axios.get('/api/config');
    if (res.data.success && res.data.data.platformName) {
      platformName.value = res.data.data.platformName;
    }
  } catch (err) {
    console.warn('获取系统名称配置失败:', err);
  }
});
</script>
