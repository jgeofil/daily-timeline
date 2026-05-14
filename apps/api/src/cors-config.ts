import type { FastifyCorsOptions } from '@fastify/cors';

export const corsOptions: FastifyCorsOptions = {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
