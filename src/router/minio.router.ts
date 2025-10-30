import Router from 'koa-router';

import MinioController from '@/controller/minio.controller';

import upload from '../middleware/multer.middleware';

const router = new Router({ prefix: '/mini' });

router.post(
  '/upload-image',
  upload.single('file'),
  MinioController.uploadFileToMinIO
);

// @ts-ignore
router.get('/get-image/:objectName', MinioController.getImageFromMinIO);

export default router;
