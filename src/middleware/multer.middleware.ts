// eslint-disable-next-line import/no-extraneous-dependencies
import multer from 'koa-multer';

// 配置 multer 存储引擎
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/'); // 临时存储目录
  },
  filename(req, file, cb) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// 创建 multer 实例
const upload = multer({ storage });

export default upload;
