import type { ScreenshotEvent } from '@daily-timeline/types';

export interface ScreenshotStorage {
  insert(event: ScreenshotEvent): ScreenshotEvent;
  list(): ScreenshotEvent[];
}

export class InMemoryScreenshotStorage implements ScreenshotStorage {
  private readonly events: ScreenshotEvent[] = [];

  insert(event: ScreenshotEvent): ScreenshotEvent {
    this.events.unshift(event);
    return event;
  }

  list(): ScreenshotEvent[] {
    return [...this.events];
  }
}
