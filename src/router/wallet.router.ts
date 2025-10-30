import Router from 'koa-router';

import walletController from '@/controller/wallet.controller';

const walletRouter = new Router({ prefix: '/wallet' });

walletRouter.get('/list', walletController.getList);

walletRouter.get('/my_wallet', walletController.findMyWallet);

walletRouter.put('/change', walletController.changeWallet);

walletRouter.get('/userBankCard/list', walletController.getBankCards);

walletRouter.get('/userBankCard/find/:id', walletController.getBankCard);

walletRouter.post('/userBankCard/create', walletController.createUserBankCard);

walletRouter.put('/userBankCard/update', walletController.updateUserBankCard);

walletRouter.delete(
  '/userBankCard/delete/:id',
  walletController.deleteUserBankCard
);

walletRouter.get('/bank/list', walletController.getBankList);

walletRouter.post('/bank/create', walletController.createBank);

walletRouter.put('/bank/update', walletController.updateBank);

walletRouter.delete('/bank/delete', walletController.deleteBank);

walletRouter.post(
  '/rechargeRecords/create',
  walletController.createRechargeRecords
);

walletRouter.get(
  '/rechargeRecords/find/:id',
  walletController.getRechargeRecord
);

walletRouter.put(
  '/rechargeRecords/update',
  walletController.updateRechargeRecord
);

walletRouter.put(
  '/rechargeRecords/audit',
  walletController.auditRechargeRecords
);

walletRouter.get('/rechargeRecords/list', walletController.getRechargeRecords);

walletRouter.post(
  '/withdrawalRecords/create',
  walletController.createWithdrawalRecords
);

walletRouter.get(
  '/withdrawalRecords/list',
  walletController.getWithdrawalRecords
);

walletRouter.get(
  '/withdrawalRecords/find/:id',
  walletController.getWithdrawalRecord
);

walletRouter.put(
  '/withdrawalRecords/audit',
  walletController.auditWithdrawalRecords
);

walletRouter.put(
  '/setUseRechargeTarget/:id',
  walletController.useRechargeTarget
);

walletRouter.get(
  '/getUseRechargeTarget',
  walletController.getUseRechargeTarget
);

export default walletRouter;
