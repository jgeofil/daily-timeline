import type { Insight, ScreenshotEvent, TimelineEntry } from '@daily-timeline/types';
import { analyzeScreenshot } from '../vision';
import type { ScreenshotIngestionInput } from './schema';
import type { ScreenshotStorage } from './storage';
import { linkScreenshotToTimeline } from './linker';

export interface ScreenshotServiceDeps {
  storage: ScreenshotStorage;
  timelineEntries: TimelineEntry[];
  insights: Insight[];
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ingestScreenshotEvent(input: ScreenshotIngestionInput, deps: ScreenshotServiceDeps): ScreenshotEvent {
  const analysis = analyzeScreenshot({
    imageUrl: input.imageUrl,
    windowTitle: input.windowTitle ?? null,
    hintedText: input.hintedText ?? null,
  });

  // Filter timeline entries to only those belonging to the current user
  const userTimelineEntries = deps.timelineEntries.filter((entry) => entry.userId === input.userId);
  
  const linkedTimelineEntryIds = linkScreenshotToTimeline(userTimelineEntries, {
    ocrText: analysis.ocrText,
    windowTitle: input.windowTitle ?? null,
    inferredTask: analysis.inferredTask,
  });

  const screenshotEvent: ScreenshotEvent = {
    id: makeId('shot'),
    imageUrl: input.imageUrl,
    capturedAt: input.capturedAt,
    createdAt: new Date().toISOString(),
    windowTitle: input.windowTitle ?? null,
    inferredTask: analysis.inferredTask,
    ocrText: analysis.ocrText,
    entities: analysis.entities,
    taskClues: analysis.taskClues,
    anomalies: analysis.anomalies,
    linkedTimelineEntryIds,
  };

  deps.storage.insert(screenshotEvent);

  const timelineEntry: TimelineEntry = {
    id: makeId('entry'),
    userId: input.userId,
    source: 'screenshot',
    createdAt: screenshotEvent.createdAt,
    occurredAt: screenshotEvent.capturedAt,
    text: analysis.ocrText ?? input.windowTitle ?? 'Screenshot captured',
    tags: ['screenshot', ...analysis.taskClues, ...analysis.entities.slice(0, 2)].slice(0, 6),
  };
  deps.timelineEntries.unshift(timelineEntry);

  if (analysis.anomalies.length > 0) {
    deps.insights.unshift({
      id: makeId('insight'),
      entryIds: [...linkedTimelineEntryIds, timelineEntry.id].slice(0, 6),
      createdAt: new Date().toISOString(),
      type: 'anomaly',
      summary: `Possible missed detail: screenshot suggests ${analysis.anomalies.join(', ')}.`,
      confidence: 0.68,
    });
  }

  return screenshotEvent;
}
