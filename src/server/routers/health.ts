import express, { Router } from 'express';

/** Answers 200 when `isReady` returns true, 503 before that */
export function createHealthRouter(isReady: () => boolean = () => true): Router {
  const router = express.Router();

  // Health check endpoint
  router.get('/', (req, res) => (isReady() ? res.status(200).send('OK') : res.status(503).send('Starting')));

  return router;
}
