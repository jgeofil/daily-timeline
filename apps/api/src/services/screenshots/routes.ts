import type { FastifyInstance } from 'fastify';
import type { Insight, TimelineEntry } from '@daily-timeline/types';
import { ScreenshotIngestionSchema } from './schema';
import { ingestScreenshotEvent } from './service';
import type { ScreenshotStorage } from './storage';

interface ScreenshotRoutesOptions {
  storage: ScreenshotStorage;
  timelineEntries: TimelineEntry[];
  insights: Insight[];
}

export function registerScreenshotRoutes(server: FastifyInstance, options: ScreenshotRoutesOptions): void {
  server.get('/screenshots/events', { preHandler: [server.authenticate] }, async () => ({ data: options.storage.list() }));

  server.post('/screenshots/events', { preHandler: [server.authenticate] }, async (request, reply) => {
    const parsed = ScreenshotIngestionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid screenshot event payload', details: parsed.error.issues });
    }

    const event = ingestScreenshotEvent(parsed.data, {
      storage: options.storage,
      timelineEntries: options.timelineEntries,
      insights: options.insights,
    });

    return reply.status(201).send({ data: event });
  });
}
