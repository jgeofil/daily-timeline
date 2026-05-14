import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { Insight, ScreenshotEvent, TimelineEntry, VoiceCaptureSession } from '@daily-timeline/types';
import { corsOptions } from '../cors-config';

const JWT_SECRET = process.env.JWT_SECRET ?? 'jwt-test-placeholder-16ch';

/**
 * Build a Fastify app with the same routes as server.ts, but without the
 * module-level side effects (readConfig(process.env) and server.listen()).
 * This mirrors exactly the routes defined in apps/api/src/server.ts.
 */
function buildApp(allowedOrigins: string[] = ['http://localhost:5173']): FastifyInstance {
  const app = Fastify({ logger: false });

  app.register(cors, {
    ...corsOptions,
    origin: allowedOrigins
  });

  const timelineEntries: TimelineEntry[] = [];
  const voiceSessions: VoiceCaptureSession[] = [];
  const insights: Insight[] = [];
  const screenshotStorage = new InMemoryScreenshotStorage();

  app.get('/health', async () => ({ ok: true, service: 'daily-timeline-api' }));
  app.get('/timeline/entries', async () => ({ data: timelineEntries }));
  app.get('/voice/sessions', async () => ({ data: voiceSessions }));
  registerScreenshotRoutes(app, { storage: screenshotStorage, timelineEntries, insights });
  app.get('/insights', async () => ({ data: insights }));

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

  it('GET /health returns service status', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, service: 'daily-timeline-api' });
  });

  it('GET /screenshots/events returns array shape', async () => {
    const response = await app.inject({ method: 'GET', url: '/screenshots/events' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [] });
  });

  it('POST /screenshots/events stores enriched screenshot event and creates timeline entry', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/screenshots/events',
      payload: {
        imageUrl: 'https://storage.example.com/editor-error-warning.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        windowTitle: 'VSCode deploy warning',
        hintedText: 'TODO fix deploy error before review',
        userId: 'user-1',
      },
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

    const insightResponse = await app.inject({ method: 'GET', url: '/insights' });
    expect(insightResponse.json().data).toHaveLength(1);
    expect(insightResponse.json().data[0].summary).toContain('Possible missed detail');
  });

  it('POST /screenshots/events validates payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/screenshots/events',
      payload: { imageUrl: 'not-a-url' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('POST /screenshots/events returns 400 with error details when userId is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/screenshots/events',
      payload: {
        imageUrl: 'https://storage.example.com/screenshot.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        // userId intentionally omitted
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('details');
  });

  it('multiple POST /screenshots/events accumulate in the list', async () => {
    const payload = (title: string) => ({
      imageUrl: `https://storage.example.com/${title}.png`,
      capturedAt: '2024-01-15T09:00:00.000Z',
      windowTitle: title,
      userId: 'user-1',
    });

    await app.inject({ method: 'POST', url: '/screenshots/events', payload: payload('first-shot') });
    await app.inject({ method: 'POST', url: '/screenshots/events', payload: payload('second-shot') });
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

    const listResponse = await app.inject({ method: 'GET', url: '/screenshots/events' });
    expect(listResponse.json().data).toHaveLength(2);
  });

  it('GET /timeline/entries returns empty data array initially', async () => {
    const response = await app.inject({ method: 'GET', url: '/timeline/entries' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [] });
  });

  it('GET /insights returns empty data array initially', async () => {
    const response = await app.inject({ method: 'GET', url: '/insights' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [] });
  });

  it('POST /screenshots/events does NOT create insight when no anomalies in input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/screenshots/events',
      payload: {
        imageUrl: 'https://storage.example.com/clean-normal-screenshot.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        windowTitle: 'Normal Editor',
        hintedText: 'just routine work session today',
        userId: 'user-1',
      },
    });

    expect(response.statusCode).toBe(201);

    const insightResponse = await app.inject({ method: 'GET', url: '/insights' });
    expect(insightResponse.json().data).toHaveLength(0);
  });

  it('GET /screenshots/events returns JSON content-type', async () => {
    const response = await app.inject({ method: 'GET', url: '/screenshots/events' });
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns 404 for an unregistered route', async () => {
    const response = await app.inject({ method: 'GET', url: '/unknown-route' });
    expect(response.statusCode).toBe(404);
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

  describe('CORS configuration', () => {
    it('returns Access-Control-Allow-Origin header for allowed origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'http://localhost:5173'
        }
      });

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('does not return Access-Control-Allow-Origin header for disallowed origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'http://malicious-site.com'
        }
      });

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('returns CORS headers for OPTIONS preflight request', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'GET'
        }
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    it('includes POST in the Access-Control-Allow-Methods header', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'POST'
        }
      });

      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('includes DELETE in the Access-Control-Allow-Methods header', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'DELETE'
        }
      });

      expect(response.headers['access-control-allow-methods']).toContain('DELETE');
    });

    it('includes Content-Type in Access-Control-Allow-Headers', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'Content-Type'
        }
      });

      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('includes Authorization in Access-Control-Allow-Headers', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'Authorization'
        }
      });

      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });

    it('does not set CORS headers when no Origin header is sent', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('CORS with multiple allowed origins', () => {
    let multiOriginApp: FastifyInstance;

    beforeEach(async () => {
      multiOriginApp = buildApp(['http://localhost:5173', 'https://app.example.com']);
      await multiOriginApp.ready();
    });

    afterEach(async () => {
      await multiOriginApp.close();
    });

    it('allows the first origin in the list', async () => {
      const response = await multiOriginApp.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:5173' }
      });

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('allows the second origin in the list', async () => {
      const response = await multiOriginApp.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'https://app.example.com' }
      });

      expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
    });

    it('blocks an origin not in the list', async () => {
      const response = await multiOriginApp.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://evil.com' }
      });

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
