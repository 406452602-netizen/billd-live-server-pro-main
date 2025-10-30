import Router from 'koa-router';

import AdCarouselController from '@/controller/adCarousel.controller';

const adCarouselRouter = new Router({ prefix: '/adCarousel' });

adCarouselRouter.post('/create', AdCarouselController.create);
adCarouselRouter.get('/find/:id', AdCarouselController.find);
adCarouselRouter.post('/list', AdCarouselController.getList);
adCarouselRouter.get('/getAllList', AdCarouselController.getAllList);
adCarouselRouter.post('/get', AdCarouselController.getList);
adCarouselRouter.put('/update/:id', AdCarouselController.update);
adCarouselRouter.delete('/delete/:id', AdCarouselController.delete);

export default adCarouselRouter;
