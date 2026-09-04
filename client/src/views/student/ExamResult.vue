<template>
  <div class="min-h-screen bg-slate-50 p-4 max-w-md mx-auto space-y-6 flex flex-col justify-center py-10">
    <!-- 得分卡片 -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center space-y-3">
      <div class="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl font-bold"
           :class="result.isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'">
        {{ result.isPassed ? '✓' : '✕' }}
      </div>

      <h2 class="text-xl font-bold text-gray-900">
        {{ result.isPassed ? '恭喜您完成考试并成功合格！' : '很遗憾，未能达到合格分数线' }}
      </h2>

      <div class="py-2">
        <span class="text-4xl font-black" :class="result.isPassed ? 'text-green-600' : 'text-red-500'">
          {{ result.score }}
        </span>
        <span class="text-xs text-gray-400 font-semibold"> / {{ result.totalScore }} 分</span>
      </div>
    </div>

    <!-- 题目解析列表 (如果开关允许) -->
    <div v-if="result.showAnswers && result.details" class="space-y-4">
      <h3 class="font-bold text-gray-800 text-sm flex items-center gap-2">
        <el-icon class="text-blue-600"><DocumentChecked /></el-icon>
        答题细节与完整解析
      </h3>

      <div v-for="(q, idx) in result.details" :key="q.questionId" class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-2">
        <div class="flex items-center justify-between text-xs border-b pb-2">
          <span class="font-bold text-gray-700">第 {{ idx + 1 }} 题 ({{ q.score }} / {{ q.totalScore }} 分)</span>
          <el-tag :type="q.isCorrect ? 'success' : 'danger'" size="small">
            {{ q.isCorrect ? '回答正确' : '回答错误' }}
          </el-tag>
        </div>

        <div class="text-sm font-bold text-gray-900">{{ q.stem }}</div>

        <div class="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1">
          <div><span class="text-gray-500">您的答案:</span> <span class="font-bold" :class="q.isCorrect ? 'text-green-600' : 'text-red-500'">{{ formatAns(q.userAnswer) }}</span></div>
          <div><span class="text-gray-500">标准答案:</span> <span class="font-bold text-blue-600">{{ formatAns(q.standardAnswer) }}</span></div>
        </div>

        <div v-if="q.analysis" class="text-xs text-gray-500 pt-1 border-t border-dashed">
          <span class="font-semibold text-gray-700">💡 考点解析:</span> {{ q.analysis }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const result = ref({
  score: 0,
  totalScore: 100,
  isPassed: false,
  showAnswers: true,
  details: []
});

const formatAns = (ans) => {
  if (!ans) return '未作答';
  if (Array.isArray(ans)) return ans.join(', ');
  return String(ans);
};

onMounted(() => {
  if (route.query.resultData) {
    try {
      result.value = JSON.parse(route.query.resultData);
    } catch (e) {}
  }
});
</script>
