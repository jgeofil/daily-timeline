import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import type { Insight, ScreenshotEvent, TimelineEntry, VoiceCaptureSession } from '@daily-timeline/types';
import { readConfig } from './config';
import { corsOptions } from './cors-config';
import { registerScreenshotRoutes } from './services/screenshots/routes';
import { InMemoryScreenshotStorage } from './services/screenshots/storage';

const config = readConfig(process.env);
const server = Fastify({ logger: { level: config.LOG_LEVEL } });

const corsAllowedOrigins = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.split(',').map((origin) => origin.trim()))
  .pipe(z.array(z.string().url()).min(1))
  .catch(['http://localhost:5173'])
  .parse(process.env.CORS_ALLOWED_ORIGINS);

server.register(cors, {
  ...corsOptions,
  origin: corsAllowedOrigins
});

const timelineEntries: TimelineEntry[] = [];
const voiceSessions: VoiceCaptureSession[] = [];
const insights: Insight[] = [];
const screenshotStorage = new InMemoryScreenshotStorage();

server.get('/health', async () => ({ ok: true, service: 'daily-timeline-api' }));

server.get('/timeline/entries', { preHandler: [server.authenticate] }, async () => ({ data: timelineEntries }));
server.get('/voice/sessions', { preHandler: [server.authenticate] }, async () => ({ data: voiceSessions }));
registerScreenshotRoutes(server, { storage: screenshotStorage, timelineEntries, insights });
server.get('/insights', { preHandler: [server.authenticate] }, async () => ({ data: insights }));

server.listen({ port: config.PORT, host: '0.0.0.0' }).catch((error: Error) => {
  server.log.error(error);
  process.exit(1);
});

