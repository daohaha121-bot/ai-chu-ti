<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <el-card class="shadow-sm border-0 rounded-xl">
      <template #header>
        <div class="flex items-center gap-2 font-bold text-gray-800 text-base">
          <el-icon class="text-blue-600"><MagicStick /></el-icon>
          AI 智能生成试卷与出题参数配置
        </div>
      </template>

      <el-form :model="form" label-position="top" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <el-form-item label="试卷名称 / 主题学科" required>
            <el-input v-model="form.title" placeholder="例如：2026年安全生产考核卷 或 Python基础语法测试" />
          </el-form-item>

          <el-form-item label="知识点 / 考核重点">
            <el-input v-model="form.topic" placeholder="例如：控制语句、异常处理、消防安全常识" />
          </el-form-item>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <el-form-item label="题目数量">
            <el-input-number v-model="form.totalQuestions" :min="1" :max="50" class="w-full" />
          </el-form-item>

          <el-form-item label="试卷总分值">
            <el-input-number v-model="form.totalScore" :min="10" :max="500" :step="10" class="w-full" />
          </el-form-item>

          <el-form-item label="难度等级">
            <el-select v-model="form.difficulty" class="w-full">
              <el-option label="简单 (Easy)" value="easy" />
              <el-option label="中等 (Medium)" value="medium" />
              <el-option label="困难 (Hard)" value="hard" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="包含题型组合 (多选)" required>
          <el-checkbox-group v-model="form.questionTypes">
            <el-checkbox label="single_choice">单选题</el-checkbox>
            <el-checkbox label="multi_choice">多选题</el-checkbox>
            <el-checkbox label="true_false">判断题</el-checkbox>
            <el-checkbox label="fill_blank">填空题</el-checkbox>
            <el-checkbox label="short_answer">简答题</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="考生入场必填个人信息配置">
          <el-checkbox-group v-model="form.requiredFields">
            <el-checkbox label="name">姓名 (必选)</el-checkbox>
            <el-checkbox label="student_id">学号 / 工号</el-checkbox>
            <el-checkbox label="department">部门 / 班级</el-checkbox>
            <el-checkbox label="phone">手机号码</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="出题参考资料上传 (支持 .pdf, .docx, .txt, .md)">
          <el-upload
            class="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition"
            action=""
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            accept=".pdf,.docx,.doc,.txt,.md"
          >
            <el-icon class="text-3xl text-gray-400 mb-2"><UploadFilled /></el-icon>
            <div class="text-sm text-gray-600">点击或将知识库/参考文件拖拽至此处</div>
            <div class="text-xs text-gray-400 mt-1">AI 将深入理解文档内容并精准提取考点出题</div>
          </el-upload>
        </el-form-item>

        <div class="pt-4 border-t flex justify-end gap-3">
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="submitGenerate"
            class="px-8 font-bold"
          >
            <el-icon class="mr-1"><MagicStick /></el-icon>
            立即召唤 AI 智能生成试卷
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 生成成功提示弹窗 -->
    <el-dialog v-model="showSuccessDialog" title="✨ 试卷生成成功！" width="500px" center>
      <div class="text-center py-4 space-y-3">
        <el-icon class="text-5xl text-green-500"><SuccessFilled /></el-icon>
        <h3 class="font-bold text-lg text-gray-800">{{ generatedExam?.title }}</h3>
        <p class="text-sm text-gray-500">已自动生成 {{ generatedExam?.questions?.length || 0 }} 道试题，总分 {{ generatedExam?.totalScore }} 分。</p>
      </div>

      <template #footer>
        <div class="flex justify-center gap-3">
          <el-button type="primary" plain @click="gotoEdit">
            <el-icon class="mr-1"><Edit /></el-icon>
            在线二次编辑
          </el-button>
          <el-button type="primary" @click="gotoQr">
            <el-icon class="mr-1"><FullScreen /></el-icon>
            绑定活码并生成二维码
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const router = useRouter();
const loading = ref(false);
const showSuccessDialog = ref(false);
const generatedExam = ref(null);
const referenceFile = ref(null);

const form = reactive({
  title: '',
  topic: '',
  totalQuestions: 10,
  totalScore: 100,
  difficulty: 'medium',
  questionTypes: ['single_choice', 'multi_choice', 'true_false', 'fill_blank'],
  requiredFields: ['name', 'student_id']
});

const handleFileChange = (file) => {
  referenceFile.value = file.raw;
};

const handleFileRemove = () => {
  referenceFile.value = null;
};

const submitGenerate = async () => {
  if (form.questionTypes.length === 0) {
    return ElMessage.warning('请至少选择一种试卷题型！');
  }

  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('topic', form.topic);
    formData.append('totalQuestions', form.totalQuestions);
    formData.append('totalScore', form.totalScore);
    formData.append('difficulty', form.difficulty);
    formData.append('questionTypes', JSON.stringify(form.questionTypes));
    formData.append('requiredFields', JSON.stringify(form.requiredFields));

    if (referenceFile.value) {
      formData.append('referenceFile', referenceFile.value);
    }

    const res = await axios.post('/api/exams/generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (res.data.success) {
      generatedExam.value = res.data.data;
      showSuccessDialog.value = true;
    } else {
      ElMessage.error(res.data.message || '生成失败');
    }
  } catch (error) {
    console.error('生成异常:', error);
    ElMessage.error(error.response?.data?.message || error.message || 'AI 出题异常');
  } finally {
    loading.value = false;
  }
};

const gotoEdit = () => {
  if (generatedExam.value) {
    router.push(`/admin/exam-editor/${generatedExam.value.id}`);
  }
};

const gotoQr = () => {
  router.push('/admin/qr-manager');
};
</script>
