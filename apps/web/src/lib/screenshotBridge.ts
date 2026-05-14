import type { ScreenshotEvent } from '@daily-timeline/types';

const BRIDGE_EVENT = 'daily-timeline:screenshot';

export type ScreenshotBridgeHandler = (event: ScreenshotEvent) => void;

function isValidScreenshotEvent(obj: unknown): obj is ScreenshotEvent {
  if (!obj || typeof obj !== 'object') return false;
  const event = obj as Partial<ScreenshotEvent>;
  return (
    typeof event.id === 'string' &&
    typeof event.imageUrl === 'string' &&
    typeof event.capturedAt === 'string' &&
    typeof event.createdAt === 'string' &&
    Array.isArray(event.entities) &&
    Array.isArray(event.taskClues) &&
    Array.isArray(event.anomalies) &&
    Array.isArray(event.linkedTimelineEntryIds)
  );
}

export function listenForScreenshotEvents(handler: ScreenshotBridgeHandler): () => void {
  const listener = (event: Event): void => {
    const custom = event as CustomEvent<ScreenshotEvent>;
    if (custom.detail && isValidScreenshotEvent(custom.detail)) {
      handler(custom.detail);
    }
  };

  window.addEventListener(BRIDGE_EVENT, listener as EventListener);
  return () => window.removeEventListener(BRIDGE_EVENT, listener as EventListener);
}

export function emitScreenshotEvent(event: ScreenshotEvent): void {
  window.dispatchEvent(new CustomEvent<ScreenshotEvent>(BRIDGE_EVENT, { detail: event }));
}
