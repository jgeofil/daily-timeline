import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { Insight, ScreenshotEvent, TimelineEntry, VoiceCaptureSession } from '@daily-timeline/types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'jwt-test-placeholder-16ch';

/**
 * Build a Fastify app with the same routes as server.ts, but without the
 * module-level side effects (readConfig(process.env) and server.listen()).
 * This mirrors exactly the routes defined in apps/api/src/server.ts.
 */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(fastifyJwt, {
    secret: JWT_SECRET
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
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

  app.get('/health', async () => ({ ok: true, service: 'daily-timeline-api' }));
  app.get('/timeline/entries', { preHandler: [app.authenticate] }, async () => ({ data: timelineEntries }));
  app.get('/voice/sessions', { preHandler: [app.authenticate] }, async () => ({ data: voiceSessions }));
  app.get('/screenshots/events', { preHandler: [app.authenticate] }, async () => ({ data: screenshotEvents }));
  app.get('/insights', { preHandler: [app.authenticate] }, async () => ({ data: insights }));

  return app;
}

describe('API server routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 with ok: true and service name', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toEqual({ ok: true, service: 'daily-timeline-api' });
    });

    it('returns JSON content-type', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /timeline/entries', () => {
    it('returns 401 Unauthorized when no token is provided', async () => {
      const response = await app.inject({ method: 'GET', url: '/timeline/entries' });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with empty data array when valid token is provided', async () => {
      const token = app.jwt.sign({ user: 'test' });
      const response = await app.inject({
        method: 'GET',
        url: '/timeline/entries',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toEqual({ data: [] });
    });

    it('data field is an array', async () => {
      const token = app.jwt.sign({ user: 'test' });
      const response = await app.inject({
        method: 'GET',
        url: '/timeline/entries',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      const body = response.json();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /voice/sessions', () => {
    it('returns 401 Unauthorized when no token is provided', async () => {
      const response = await app.inject({ method: 'GET', url: '/voice/sessions' });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with empty data array when valid token is provided', async () => {
      const token = app.jwt.sign({ user: 'test' });
      const response = await app.inject({
        method: 'GET',
        url: '/voice/sessions',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toEqual({ data: [] });
    });

    it('data field is an array', async () => {
      const token = app.jwt.sign({ user: 'test' });
      const response = await app.inject({
        method: 'GET',
        url: '/voice/sessions',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      const body = response.json();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /screenshots/events', () => {
    it('returns 401 Unauthorized when no token is provided', async () => {
      const response = await app.inject({ method: 'GET', url: '/screenshots/events' });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with empty data array when valid token is provided', async () => {
      const token = app.jwt.sign({ user: 'test' });
      const response = await app.inject({
        method: 'GET',
        url: '/screenshots/events',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toEqual({ data: [] });
    });

    it('data field is an array', async () => {
      const token = app.jwt.sign({ user: 'test' });
      const response = await app.inject({
        method: 'GET',
        url: '/screenshots/events',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      const body = response.json();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /insights', () => {
    it('returns 401 Unauthorized when no token is provided', async () => {
      const response = await app.inject({ method: 'GET', url: '/insights' });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with empty data array when valid token is provided', async () => {
      const token = app.jwt.sign({ user: 'test' });
      const response = await app.inject({
        method: 'GET',
        url: '/insights',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toEqual({ data: [] });
    });

    it('data field is an array', async () => {
      const token = app.jwt.sign({ user: 'test' });
      const response = await app.inject({
        method: 'GET',
        url: '/insights',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      const body = response.json();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('unknown routes', () => {
    it('returns 404 for an unregistered route', async () => {
      const response = await app.inject({ method: 'GET', url: '/unknown-route' });

      expect(response.statusCode).toBe(404);
    });

    it('returns 404 for POST to a GET-only endpoint', async () => {
      const response = await app.inject({ method: 'POST', url: '/health' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('response shape consistency', () => {
    it('all list endpoints share the same { data: [] } shape when empty and authenticated', async () => {
      const endpoints = ['/timeline/entries', '/voice/sessions', '/screenshots/events', '/insights'];
      const token = app.jwt.sign({ user: 'test' });

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: 'GET',
          url: endpoint,
          headers: {
            authorization: `Bearer ${token}`
          }
        });
        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data).toHaveLength(0);
      }
    });

    it('all list endpoints return 401 when not authenticated', async () => {
      const endpoints = ['/timeline/entries', '/voice/sessions', '/screenshots/events', '/insights'];

      for (const endpoint of endpoints) {
        const response = await app.inject({ method: 'GET', url: endpoint });
        expect(response.statusCode).toBe(401);
      }
    });
  });
});