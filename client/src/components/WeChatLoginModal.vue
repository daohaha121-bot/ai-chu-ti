<template>
  <el-dialog
    v-model="visible"
    title="登录创作者工作台"
    width="420px"
    center
    :close-on-click-modal="false"
    class="rounded-2xl"
  >
    <div class="py-2 text-center space-y-4">
      <!-- 微信扫码选项卡 -->
      <div v-if="!showDevMode" class="space-y-4">
        <div class="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600 mb-1">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.691 2.188C3.891 2.188 0 5.478 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.294.295a.326.326 0 0 0 .167-.05l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.833.402c.264 0 .524-.015.783-.036a5.55 5.55 0 0 1-.167-1.35c0-3.385 3.32-6.133 7.417-6.133.284 0 .564.014.84.04C16.634 5.344 12.94 2.188 8.69 2.188zm-2.454 4.14c.54 0 .978.44.978.98 0 .542-.438.98-.978.98s-.979-.438-.979-.98c0-.54.44-.98.979-.98zm4.896 0c.54 0 .979.44.979.98 0 .542-.439.98-.979.98-.54 0-.978-.438-.978-.98 0-.54.438-.98.978-.98z"/>
          </svg>
        </div>

        <div>
          <h3 class="font-bold text-gray-900 text-base">微信扫码一键登录</h3>
          <p class="text-xs text-gray-400 mt-0.5">扫码登录后自动同步云端试卷、保存答题记录</p>
        </div>

        <div class="p-4 bg-gray-50 rounded-xl inline-block border shadow-inner">
          <qrcode-vue :value="qrValue" :size="160" level="M" />
        </div>

        <div>
          <el-button type="success" size="large" class="w-full font-bold shadow-md" :loading="loading" @click="simulateWechatScan">
            微信扫码一键登录
          </el-button>
        </div>

        <div class="pt-2 border-t flex justify-center">
          <button class="text-xs text-gray-400 hover:text-blue-600 transition" @click="showDevMode = true">
            🔑 我是平台主理人？进入开发者模式
          </button>
        </div>
      </div>

      <!-- 开发者专属通道 -->
      <div v-else class="space-y-4 text-left">
        <div class="text-center space-y-1">
          <div class="inline-block p-2.5 rounded-xl bg-blue-50 text-blue-600 text-xl font-bold">🛠️</div>
          <h3 class="font-bold text-gray-900 text-base">超级开发者管理通道</h3>
          <p class="text-xs text-gray-400">仅限系统主理人使用，解锁全站收益与配置管理</p>
        </div>

        <el-form label-position="top">
          <el-form-item label="开发者超级口令">
            <el-input
              v-model="devPassword"
              type="password"
              show-password
              placeholder="请输入开发者管理员口令 (默认: admin888)"
              size="large"
              @keyup.enter="handleDevLogin"
            />
          </el-form-item>

          <el-button type="primary" size="large" class="w-full font-bold mt-2" :loading="loading" @click="handleDevLogin">
            立即解锁开发者模式
          </el-button>
        </el-form>

        <div class="pt-2 text-center">
          <button class="text-xs text-gray-400 hover:text-emerald-600" @click="showDevMode = false">
            ← 返回普通用户微信登录
          </button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { ElMessage } from 'element-plus';
import api from '../utils/api';

const visible = ref(false);
const showDevMode = ref(false);
const loading = ref(false);
const devPassword = ref('');
const qrValue = ref('https://weixin.qq.com/r/ai-exam-login');

const emit = defineEmits(['login-success']);

const open = () => {
  visible.value = true;
  showDevMode.value = false;
  devPassword.value = '';
};

const close = () => {
  visible.value = false;
};

// 微信快捷登录
const simulateWechatScan = async () => {
  loading.value = true;
  try {
    const res = await api.post('/auth/wechat-login', {
      nickname: '微信创作者_' + Math.floor(Math.random() * 899 + 100)
    });
    if (res.data.success) {
      localStorage.setItem('token', res.data.data.token);
      ElMessage.success('微信登录成功！已为您赠送 3 次免费试卷配额！');
      visible.value = false;
      emit('login-success', res.data.data.user);
    }
  } catch (err) {
    ElMessage.error('登录失败');
  } finally {
    loading.value = false;
  }
};

// 开发者专属登录
const handleDevLogin = async () => {
  if (!devPassword.value) {
    return ElMessage.warning('请输入开发者口令！');
  }

  loading.value = true;
  try {
    const res = await api.post('/auth/developer-login', { password: devPassword.value });
    if (res.data.success) {
      localStorage.setItem('token', res.data.data.token);
      ElMessage.success('🎉 开发者模式解锁成功！已开启全局管理与变现中心！');
      visible.value = false;
      emit('login-success', res.data.data.user);
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '口令错误');
  } finally {
    loading.value = false;
  }
};

defineExpose({ open, close });
</script>
