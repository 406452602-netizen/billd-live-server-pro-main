import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

// eslint-disable-next-line import/no-extraneous-dependencies
import { v4 as uuidv4 } from 'uuid';

import { minioClient } from '../config/minio';

import type { Context } from 'koa';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { CustomError } from '@/model/customError.model';

// 允许上传的文件类型
const ALLOWED_FILE_TYPES: string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
// 最大文件大小，这里设置为 5MB
const MAX_FILE_SIZE: number = 5 * 1024 * 1024;
const BUCKET_NAME = 'default'; // 替换为实际的存储桶名称

// 定义上传文件的类型
interface UploadedFile {
  fieldname: string;
  originalFilename: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  filepath: string;
  buffer?: Buffer;
}

/**
 * 辅助函数：根据文件名获取 MIME 类型
 * @param fileName - 文件名
 * @returns MIME 类型字符串
 */
const getMimeType = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
};

/**
 * 辅助函数：将流转换为 Buffer
 * @param stream - 可读流对象
 * @returns 包含流数据的 Buffer
 */
const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err: Error) => reject(err));
  });
};

class MinioController {
  /**
   * 上传文件到 MinIO
   * @param ctx - Koa 上下文对象
   */
  uploadFileToMinIO = async (ctx: Context, next): Promise<void> => {
    const files = ctx.request.files as
      | { file?: UploadedFile | UploadedFile[] }
      | undefined;
    const file = files?.file;

    if (!file) {
      ctx.status = 400;
      ctx.body = { error: '未提供上传文件' };
      return;
    }

    const fileInfo: UploadedFile = Array.isArray(file) ? file[0] : file;

    // 验证文件类型
    if (!ALLOWED_FILE_TYPES.includes(fileInfo.mimetype)) {
      ctx.status = 400;
      ctx.body = {
        error: `不支持的文件类型，仅支持 ${ALLOWED_FILE_TYPES.join(', ')}`,
      };
      return;
    }

    // 验证文件大小
    if (fileInfo.size > MAX_FILE_SIZE) {
      ctx.status = 400;
      ctx.body = {
        error: `文件大小超过限制，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
      return;
    }

    const fileExtension = path.extname(fileInfo.originalFilename);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const objectName = `${uuidv4()}${fileExtension}`;

    try {
      const fileStream = await fs.readFile(fileInfo.filepath);
      await minioClient.putObject(BUCKET_NAME, objectName, fileStream);
      // 返回可访问的图片接口路由
      successHandler({
        ctx,
        data: { imageUrl: `/mini/get-image/${objectName}` },
      });
      next();
    } catch (error: unknown) {
      console.error('上传文件到 MinIO 失败:', error);
      throw new CustomError({
        msg: `上传文件到 MinIO 失败`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    } finally {
      // 删除临时文件
      if (fileInfo.filepath) {
        try {
          await fs.unlink(fileInfo.filepath);
        } catch (unlinkError: unknown) {
          console.error('删除临时文件失败:', unlinkError);
        }
      }
    }
  };

  /**
   * 从 MinIO 获取图片并返回给前端
   * @param ctx - Koa 上下文对象
   */
  getImageFromMinIO = async (ctx: Context): Promise<void> => {
    const objectName = ctx.params.objectName as string;
    try {
      const stream = await minioClient.getObject(BUCKET_NAME, objectName);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const buffer = await streamToBuffer(stream);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      ctx.set('Content-Type', getMimeType(objectName));
      ctx.body = buffer;
    } catch (error: unknown) {
      console.error('从 MinIO 获取图片失败:', error);
      ctx.status = 500;
      ctx.body = { error: '从 MinIO 获取图片失败' };
    }
  };
}

export default new MinioController();
