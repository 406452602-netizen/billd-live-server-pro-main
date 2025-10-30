import { COMMON_ERROR_CODE, COMMON_HTTP_CODE } from '@/constant';

export class CustomError extends Error {
  httpStatusCode: number;

  errorCode: number;

  error: any;

  constructor(data: { msg?; httpStatusCode?; errorCode?; error? }) {
    super();
    this.message = data.msg || '服务器错误';
    this.httpStatusCode = data.httpStatusCode || COMMON_HTTP_CODE.serverError;
    this.errorCode = data.errorCode || COMMON_ERROR_CODE.serverError;
    this.error = data.error;
  }
}
