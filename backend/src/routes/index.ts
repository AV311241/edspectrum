import { Router } from 'express';
import { HttpStatusCode, HttpResponseMessage } from '../constants/httpStatus.constants';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(HttpStatusCode.OK).json({
    success: true,
    statusCode: HttpStatusCode.OK,
    message: HttpResponseMessage.SUCCESS,
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'lumino1-baseline-backend',
    },
  });
});

export default router;
