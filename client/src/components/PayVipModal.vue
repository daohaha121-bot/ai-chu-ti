<template>
  <el-dialog
    v-model="visible"
    title="💎 升级 VIP 会员 / 额度充值"
    width="520px"
    center
    :close-on-click-modal="false"
    class="rounded-2xl"
  >
    <div class="space-y-5">
      <!-- 提示文案 -->
      <div class="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-3">
        <span class="text-2xl">👑</span>
        <div class="text-xs text-amber-800">
          <div class="font-bold text-sm">开通 VIP 解锁全部高级特权</div>
          <div>无限 AI 出题 · 启用防作弊监控 · 一键导出 Excel 与高清海报</div>
        </div>
      </div>

      <!-- 套餐选择卡片 -->
      <div class="space-y-3">
        <label class="block text-xs font-bold text-gray-600">请选择购买套餐：</label>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            v-for="plan in plans"
            :key="plan.type"
            class="p-4 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between"
            :class="selectedPlan === plan.type ? 'border-blue-600 bg-blue-50/40 shadow-md' : 'border-gray-200 hover:border-gray-300'"
            @click="selectedPlan = plan.type"
          >
            <div v-if="plan.recommend" class="absolute -top-2.5 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              最受欢迎
            </div>
            <div>
              <div class="font-bold text-sm text-gray-800">{{ plan.name }}</div>
              <div class="text-xs text-gray-400 mt-1 line-clamp-2">{{ plan.desc }}</div>
            </div>
            <div class="mt-3 pt-2 border-t">
              <span class="text-xs text-red-500">¥</span>
              <span class="text-2xl font-black text-red-500">{{ plan.price }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 微信支付收银台区域 -->
      <div class="bg-gray-50 p-4 rounded-xl text-center space-y-3 border">
        <div class="text-xs font-bold text-gray-700 flex items-center justify-center gap-1">
          <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.478 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.294.295a.326.326 0 0 0 .167-.05l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.833.402c.264 0 .524-.015.783-.036a5.55 5.55 0 0 1-.167-1.35c0-3.385 3.32-6.133 7.417-6.133.284 0 .564.014.84.04C16.634 5.344 12.94 2.188 8.69 2.188zm-2.454 4.14c.54 0 .978.44.978.98 0 .542-.438.98-.978.98s-.979-.438-.979-.98c0-.54.44-.98.979-.98zm4.896 0c.54 0 .979.44.979.98 0 .542-.439.98-.979.98-.54 0-.978-.438-.978-.98 0-.54.438-.98.978-.98z"/></svg>
          微信扫码安全支付 (应付金额: ¥{{ currentPrice }})
        </div>

        <div class="p-3 bg-white rounded-lg inline-block shadow-inner border">
          <qrcode-vue :value="payQrValue" :size="130" level="M" />
        </div>

        <div>
          <el-button type="success" size="large" class="w-full font-bold shadow-md" :loading="loading" @click="handleMockPay">
            ⚡ 模拟扫码一键完成支付 (极速测试)
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { ElMessage } from 'element-plus';
import api from '../utils/api';

const visible = ref(false);
const loading = ref(false);
const selectedPlan = ref('vip_month');
const currentOrder = ref(null);
const payQrValue = ref('weixin://wxpay/bizpayurl?mock=1');

const emit = defineEmits(['pay-success']);

const plans = ref([
  { type: 'quota_10', name: '10次加油包', price: 9.9, desc: '增加 10 次出题额度，适合临时使用' },
  { type: 'vip_month', name: '月度 VIP 会员', price: 29.9, desc: '30 天无限出题 + 防作弊 + 导出', recommend: true },
  { type: 'vip_year', name: '年度 VIP 会员', price: 199.0, desc: '365 天无限畅享全部 VIP 功能' }
]);

const currentPrice = computed(() => {
  const p = plans.value.find(item => item.type === selectedPlan.value);
  return p ? p.price : 0;
});

const open = async () => {
  visible.value = true;
  await createOrder();
};

const close = () => {
  visible.value = false;
};

const createOrder = async () => {
  try {
    const res = await api.post('/orders/create', { planType: selectedPlan.value });
    if (res.data.success) {
      currentOrder.value = res.data.data.order;
      payQrValue.value = res.data.data.wechatPayUrl;
    }
  } catch (err) {
    if (err.response?.status === 401) {
      ElMessage.warning('请先点击右上角登录后再购买套餐');
    }
  }
};

const handleMockPay = async () => {
  if (!currentOrder.value) {
    await createOrder();
  }
  if (!currentOrder.value) return;

  loading.value = true;
  try {
    const res = await api.post('/orders/pay-mock', { orderNo: currentOrder.value.orderNo });
    if (res.data.success) {
      ElMessage.success(res.data.message);
      visible.value = false;
      emit('pay-success');
    }
  } catch (err) {
    ElMessage.error('支付处理失败');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const res = await api.get('/orders/plans');
    if (res.data.success && res.data.data.length > 0) {
      plans.value = res.data.data;
    }
  } catch (e) {}

  window.addEventListener('open-vip-modal', () => {
    open();
  });
});

defineExpose({ open, close });
</script>
