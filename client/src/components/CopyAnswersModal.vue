<template>
  <el-dialog
    v-model="visible"
    :title="'📋 ' + (exam?.title || '试卷') + ' - 正确答案一键复制'"
    width="620px"
    center
    destroy-on-close
  >
    <div class="space-y-4">
      <el-tabs v-model="activeTab" class="answer-tabs">
        <!-- 选项卡 1: 极简快速核对清单 -->
        <el-tab-pane label="⚡ 极简快速核对清单 (适合监考/口头对题)" name="simple">
          <div class="space-y-3 pt-2">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-center justify-between">
              <span>仅列出题号、题型与标准答案，最适合监考老师快速阅卷或群发对答案。</span>
              <el-tag size="small" type="primary">{{ exam?.questions?.length || 0 }} 题</el-tag>
            </div>

            <el-input
              type="textarea"
              :rows="12"
              readonly
              :model-value="simpleAnswerText"
              class="font-mono text-xs"
            />

            <div class="flex justify-end pt-1">
              <el-button type="primary" size="large" class="font-bold shadow" @click="copyText(simpleAnswerText, '极简答案清单')">
                <el-icon class="mr-1"><CopyDocument /></el-icon>
                一键复制极简答案清单
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- 选项卡 2: 完整试卷与考点解析版 -->
        <el-tab-pane label="📖 完整试卷+选项+考点解析版 (备课/教案)" name="full">
          <div class="space-y-3 pt-2">
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800 flex items-center justify-between">
              <span>包含每题完整题干、所有选项、标准正确答案与详细解答解析。</span>
              <el-tag size="small" type="success">满分 {{ exam?.totalScore || 100 }} 分</el-tag>
            </div>

            <el-input
              type="textarea"
              :rows="12"
              readonly
              :model-value="fullAnswerText"
              class="font-mono text-xs"
            />

            <div class="flex justify-end pt-1">
              <el-button type="primary" size="large" class="font-bold shadow bg-indigo-600 hover:bg-indigo-700 border-indigo-600" @click="copyText(fullAnswerText, '完整试卷与考点解析')">
                <el-icon class="mr-1"><CopyDocument /></el-icon>
                一键复制完整试卷与解析
              </el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  exam: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const activeTab = ref('simple');

const typeLabelMap = {
  single_choice: '单选',
  multi_choice: '多选',
  true_false: '判断',
  fill_blank: '填空',
  short_answer: '简答'
};

// 极简答案文本
const simpleAnswerText = computed(() => {
  const qList = props.exam?.questions || [];
  if (qList.length === 0) return '暂无题目';

  let output = `【${props.exam?.title || '考试'}】标准答案清单（共 ${qList.length} 题，满分 ${props.exam?.totalScore || 100} 分）：\n\n`;

  qList.forEach((q, idx) => {
    const typeName = typeLabelMap[q.type] || '题目';
    let ans = q.answer || '无';
    output += `${idx + 1}. [${typeName}] ${ans}\n`;
  });

  return output;
});

// 完整试卷与考点解析文本
const fullAnswerText = computed(() => {
  const qList = props.exam?.questions || [];
  if (qList.length === 0) return '暂无题目';

  let output = `=================================================\n`;
  output += `【试卷名称】${props.exam?.title || '在线考核试卷'}\n`;
  output += `【试卷说明】${props.exam?.description || '无'}\n`;
  output += `【分值与限时】满分: ${props.exam?.totalScore || 100}分 | 及格线: ${props.exam?.passScore || 60}分 | 限时: ${props.exam?.durationMinutes || '不限'}分钟\n`;
  output += `=================================================\n\n`;

  qList.forEach((q, idx) => {
    const typeName = typeLabelMap[q.type] || '题目';
    output += `第 ${idx + 1} 题 [${typeName}] (分值: ${q.score}分)\n`;
    output += `题干: ${q.stem}\n`;

    let parsedOpts = [];
    if (q.options) {
      parsedOpts = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options || '[]') : []);
    }

    if (parsedOpts.length > 0) {
      output += `选项:\n`;
      parsedOpts.forEach(opt => {
        output += `   ${opt}\n`;
      });
    }

    output += `【标准正确答案】: ${q.answer}\n`;
    if (q.analysis) {
      output += `【考点与解析】: ${q.analysis}\n`;
    }
    output += `-------------------------------------------------\n`;
  });

  return output;
});

const copyText = (text, label) => {
  if (!text) return;
  navigator.clipboard.writeText(text);
  ElMessage.success(`${label} 已成功复制到剪贴板！`);
};
</script>

<style scoped>
.answer-tabs :deep(.el-tabs__item) {
  font-size: 13px;
  font-weight: 600;
}
</style>
