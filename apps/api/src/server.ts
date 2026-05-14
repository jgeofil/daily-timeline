import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { Insight, ScreenshotEvent, TimelineEntry, VoiceCaptureSession } from '@daily-timeline/types';
import { readConfig } from './config';

const config = readConfig(process.env);
const server = Fastify({ logger: { level: config.LOG_LEVEL } });

server.register(fastifyJwt, {
  secret: config.JWT_SECRET
});

server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err: unknown) {
    return reply.send(err);
  }
});

const timelineEntries: TimelineEntry[] = [];
const voiceSessions: VoiceCaptureSession[] = [];
const screenshotEvents: ScreenshotEvent[] = [];
const insights: Insight[] = [];

server.get('/health', async () => ({ ok: true, service: 'daily-timeline-api' }));

server.get('/timeline/entries', { preHandler: [server.authenticate] }, async () => ({ data: timelineEntries }));
server.get('/voice/sessions', { preHandler: [server.authenticate] }, async () => ({ data: voiceSessions }));
server.get('/screenshots/events', { preHandler: [server.authenticate] }, async () => ({ data: screenshotEvents }));
server.get('/insights', { preHandler: [server.authenticate] }, async () => ({ data: insights }));

server.listen({ port: config.PORT, host: '0.0.0.0' }).catch((error: Error) => {
  server.log.error(error);
  process.exit(1);
});

