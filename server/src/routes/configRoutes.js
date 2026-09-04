import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// 获取系统配置（品牌Logo、水印文本、支付配置）
router.get('/', async (req, res) => {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          id: 'default',
          platformName: 'AI 智能考试平台',
          watermarkText: 'AI 智能考试系统出品',
          paymentConfig: JSON.stringify({ enabled: false, provider: 'alipay', price: 0 })
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...config,
        paymentConfig: JSON.parse(config.paymentConfig || '{"enabled":false}')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新系统品牌与支付设置
router.put('/', async (req, res) => {
  try {
    const { platformName, logoUrl, watermarkText, paymentConfig } = req.body;

    const updated = await prisma.systemConfig.upsert({
      where: { id: 'default' },
      update: {
        platformName,
        logoUrl,
        watermarkText,
        paymentConfig: typeof paymentConfig === 'string' ? paymentConfig : JSON.stringify(paymentConfig)
      },
      create: {
        id: 'default',
        platformName: platformName || 'AI 智能考试平台',
        logoUrl,
        watermarkText,
        paymentConfig: typeof paymentConfig === 'string' ? paymentConfig : JSON.stringify(paymentConfig || { enabled: false })
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
