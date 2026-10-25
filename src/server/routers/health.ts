import express, { Router } from 'express';

export function createHealthRouter(isReady: () => boolean = () => true): Router {
  const router = express.Router();

  router.get('/', (req, res) => (isReady() ? res.status(200).send('OK') : res.status(503).send('Starting')));

  return router;
}
