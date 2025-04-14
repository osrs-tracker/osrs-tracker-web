import express, { Router } from 'express';

export function createHealthRouter(): Router {
  const router = express.Router();

  // Health check endpoint
  router.get('/', (req, res) => res.status(200).send('OK'));

  return router;
}
