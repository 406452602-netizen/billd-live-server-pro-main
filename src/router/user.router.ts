import Router from 'koa-router';

import { apiVerifyAuth } from '@/app/verify.middleware';
import { DEFAULT_AUTH_INFO } from '@/constant';
import captchaController from '@/controller/captcha.controller';
import userController from '@/controller/user.controller';
import captchaMiddleware from '@/middleware/captcha.middleware';
import { verifyProp } from '@/middleware/user.middleware';

const userRouter = new Router({ prefix: '/user' });

userRouter.post('/create', userController.create);

userRouter.post('/register', verifyProp, userController.register);

// 验证码相关路由
userRouter.get('/captcha/generate', captchaController.generate);
userRouter.post('/captcha/verify', captchaController.verify);
userRouter.get('/captcha/generate-with-key', captchaController.generateWithKey);

// 二维码登录
userRouter.post('/qrcode_login', userController.qrCodeLogin);

// 二维码登录状态
userRouter.get('/qrcode_login_status', userController.qrCodeLoginStatus);

// 账号密码登录
userRouter.post(
  '/login',
  verifyProp,
  captchaMiddleware.verifyCaptcha,
  userController.idLogin
);

// 用户ID密码登录
userRouter.post(
  '/id_login',
  verifyProp,
  captchaMiddleware.verifyCaptcha,
  userController.idLogin
);

// 用户名密码登录
userRouter.post(
  '/username_login',
  captchaMiddleware.verifyCaptcha,
  userController.usernameLogin
);

// 用户列表
userRouter.get('/list', userController.list);

// 获取用户信息
userRouter.get('/get_user_info', userController.getUserInfo);

// 查找用户
userRouter.get('/find/:id', userController.find);

// 更新用户
userRouter.put(
  '/update/:id',
  verifyProp,
  apiVerifyAuth([DEFAULT_AUTH_INFO.USER_MANAGE.auth_value]),
  userController.update
);

// 修改密码
userRouter.put('/update_pwd', userController.updatePwd);

// 更新用户角色
userRouter.put(
  '/update_user_role/:id',
  verifyProp,
  apiVerifyAuth([DEFAULT_AUTH_INFO.USER_MANAGE.auth_value]),
  userController.updateUserRole
);

// 保持用户活跃
userRouter.get('/keep-alive', userController.keepAlive);

export default userRouter;
