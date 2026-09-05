import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import examRoutes from './routes/examRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import configRoutes from './routes/configRoutes.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`🚀 AI 智能考试系统后端服务运行在: http://localhost:${PORT}`);
  console.log(`🌐 局域网访问地址: http://0.0.0.0:${PORT}`);
  console.log(`=================================================`);
});
