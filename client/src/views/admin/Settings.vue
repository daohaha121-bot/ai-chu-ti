<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <el-card class="shadow-sm border-0 rounded-xl">
      <template #header>
        <div class="font-bold text-gray-800 flex items-center gap-2">
          <el-icon class="text-blue-600"><Setting /></el-icon>
          <span>平台品牌标识与水印定制</span>
        </div>
      </template>

      <el-form :model="config" label-position="top" class="space-y-4">
        <el-form-item label="平台名称 (显示于后台 Header 及 C 端试卷表头)">
          <el-input v-model="config.platformName" placeholder="例如：AI 智能考试认证系统" />
        </el-form-item>

        <el-form-item label="机构/平台 Logo 图片 URL (可选)">
          <el-input v-model="config.logoUrl" placeholder="输入 Logo 图片的绝对或相对 URL 地址" />
        </el-form-item>

        <el-form-item label="导出试卷/成绩单的防伪水印文本">
          <el-input v-model="config.watermarkText" placeholder="例如：由 AI 智能考试平台安全认证" />
        </el-form-item>

        <div class="pt-4 border-t flex justify-end">
          <el-button type="primary" @click="saveConfig">保存品牌标识设置</el-button>
        </div>
      </el-form>
    </el-card>

    <el-card class="shadow-sm border-0 rounded-xl">
      <template #header>
        <div class="font-bold text-gray-800 flex items-center gap-2">
          <el-icon class="text-amber-500"><Wallet /></el-icon>
          <span>商业化变现与轻量级支付扩展接口 (预留)</span>
        </div>
      </template>

      <el-form label-position="top" class="space-y-4">
        <div class="flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div>
            <div class="font-bold text-amber-900 text-sm">开启付费答题 / 高级功能商业化中间件</div>
            <div class="text-xs text-amber-700">启用后，考生扫码答题前或管理员导出报表时将触发轻量级支付收银台</div>
          </div>
          <el-switch v-model="paymentConfig.enabled" />
        </div>

        <template v-if="paymentConfig.enabled">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <el-form-item label="默认支付通道 provider">
              <el-select v-model="paymentConfig.provider" class="w-full">
                <el-option label="微信支付 (WeChat Pay)" value="wechat" />
                <el-option label="支付宝 (Alipay)" value="alipay" />
              </el-select>
            </el-form-item>

            <el-form-item label="单次答题/功能解锁单价 (元)">
              <el-input-number v-model="paymentConfig.price" :min="0.01" :step="1" class="w-full" />
            </el-form-item>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <el-form-item label="商户号 / AppID">
              <el-input v-model="paymentConfig.mchId" placeholder="例如：1688000199" />
            </el-form-item>

            <el-form-item label="支付 API 秘钥 / Key">
              <el-input v-model="paymentConfig.apiKey" type="password" show-password placeholder="微信/支付宝秘钥" />
            </el-form-item>
          </div>
        </template>

        <div class="pt-4 border-t flex justify-end">
          <el-button type="success" @click="saveConfig">保存付费机制设置</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const config = reactive({
  platformName: 'AI 智能考试平台',
  logoUrl: '',
  watermarkText: 'AI 考试系统出品'
});

const paymentConfig = reactive({
  enabled: false,
  provider: 'alipay',
  price: 1.00,
  mchId: '',
  apiKey: ''
});

const fetchConfig = async () => {
  try {
    const res = await axios.get('/api/config');
    if (res.data.success) {
      const data = res.data.data;
      config.platformName = data.platformName;
      config.logoUrl = data.logoUrl || '';
      config.watermarkText = data.watermarkText || '';
      if (data.paymentConfig) {
        Object.assign(paymentConfig, data.paymentConfig);
      }
    }
  } catch (err) {
    ElMessage.error('获取系统配置失败');
  }
};

const saveConfig = async () => {
  try {
    await axios.put('/api/config', {
      platformName: config.platformName,
      logoUrl: config.logoUrl,
      watermarkText: config.watermarkText,
      paymentConfig
    });
    ElMessage.success('系统品牌与付费配置保存成功！');
  } catch (err) {
    ElMessage.error('保存配置失败');
  }
};

onMounted(fetchConfig);
</script>
