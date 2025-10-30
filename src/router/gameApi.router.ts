import Router from 'koa-router';

import gameApiController from '@/controller/gameApi.controller';

const router = new Router({ prefix: '/gameApi' });

// 获取第三方API秘钥 - 对外开放接口
router.get('/getThirdPartyApiKey', gameApiController.getThirdPartyApiKey);

// 创建玩家
router.get('/createPlayer', gameApiController.createPlayer);

// 获取玩家资料
router.get('/profile', gameApiController.getProfile);

// 存款
router.put('/deposit', gameApiController.deposit);

// 取款
router.put('/withdraw', gameApiController.withdraw);

// 投注登录
router.get('/betLogin', gameApiController.betLogin);

// 投注大厅
router.get('/betLobby', gameApiController.betLobby);

// 投注列表
router.get('/betList', gameApiController.betList);

// 分页投注列表
router.get('/betListPage', gameApiController.betListByPage);

// 投注历史
router.get('/betHistory', gameApiController.betHistory);

// 中奖号码
router.get('/winningNumber', gameApiController.winningNumber);

// 开奖结果
router.get('/drawResult', gameApiController.drawResult);

// 更新玩家状态/密码
router.get('/updatePlayerStatus', gameApiController.updatePlayerStatus);

router.get('/getGames', gameApiController.getGames);

router.get('/getGameIntegrations/:id', gameApiController.getGameIntegrations);

router.get('/getGamesNames', gameApiController.getGamesNames);

router.put('/withdrawAll', gameApiController.withdrawAll);

export default router;
