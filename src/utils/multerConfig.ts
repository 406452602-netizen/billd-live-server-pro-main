import path from 'path';

import multer from 'multer';

// 配置存储引擎
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// 创建 multer 实例
const upload = multer({ storage });

export default upload;
