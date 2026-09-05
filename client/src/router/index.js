import { createRouter, createWebHistory } from 'vue-router';

import AdminLayout from '../views/admin/AdminLayout.vue';
import AiGenerate from '../views/admin/AiGenerate.vue';
import ExamList from '../views/admin/ExamList.vue';
import ExamEditor from '../views/admin/ExamEditor.vue';
import QrManager from '../views/admin/QrManager.vue';
import Analytics from '../views/admin/Analytics.vue';
import Settings from '../views/admin/Settings.vue';
import DeveloperCenter from '../views/admin/DeveloperCenter.vue';

import ExamPlay from '../views/student/ExamPlay.vue';
import ExamResult from '../views/student/ExamResult.vue';

const routes = [
  {
    path: '/',
    redirect: '/admin/ai-generate'
  },
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      { path: 'ai-generate', name: 'AiGenerate', component: AiGenerate, meta: { title: 'AI 智能出题' } },
      { path: 'exams', name: 'ExamList', component: ExamList, meta: { title: '试卷库管理' } },
      { path: 'exam-editor/:id', name: 'ExamEditor', component: ExamEditor, meta: { title: '试卷二次编辑' } },
      { path: 'qr-manager', name: 'QrManager', component: QrManager, meta: { title: '动态活码管理' } },
      { path: 'analytics/:examId', name: 'Analytics', component: Analytics, meta: { title: '答题数据分析与导出' } },
      { path: 'developer', name: 'DeveloperCenter', component: DeveloperCenter, meta: { title: '开发者变现中心' } },
      { path: 'settings', name: 'Settings', component: Settings, meta: { title: '平台品牌与付费设置' } }
    ]
  },
  {
    path: '/exam/:codeKey',
    name: 'ExamPlay',
    component: ExamPlay,
    meta: { title: '在线考试答题' }
  },
  {
    path: '/exam-result',
    name: 'ExamResult',
    component: ExamResult,
    meta: { title: '答题成绩单与解析' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - AI 智能考试平台`;
  }
  next();
});

export default router;
