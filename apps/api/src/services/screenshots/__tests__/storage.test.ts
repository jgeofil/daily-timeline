import { describe, expect, it, beforeEach } from 'vitest';
import type { ScreenshotEvent } from '@daily-timeline/types';
import { InMemoryScreenshotStorage } from '../storage';

function makeEvent(id: string): ScreenshotEvent {
  return {
    id,
    imageUrl: `https://example.com/${id}.png`,
    capturedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:01.000Z',
    windowTitle: null,
    inferredTask: null,
    ocrText: null,
    entities: [],
    taskClues: [],
    anomalies: [],
    linkedTimelineEntryIds: [],
  };
}

describe('InMemoryScreenshotStorage', () => {
  let storage: InMemoryScreenshotStorage;

  beforeEach(() => {
    storage = new InMemoryScreenshotStorage();
  });

  it('starts with an empty list', () => {
    expect(storage.list()).toHaveLength(0);
  });

  it('insert returns the same event object', () => {
    const event = makeEvent('shot-1');
    const returned = storage.insert(event);
    expect(returned).toBe(event);
  });

  it('list returns the inserted event', () => {
    const event = makeEvent('shot-1');
    storage.insert(event);
    expect(storage.list()).toHaveLength(1);
    expect(storage.list()[0].id).toBe('shot-1');
  });

  it('most recently inserted event appears first (unshift order)', () => {
    storage.insert(makeEvent('first'));
    storage.insert(makeEvent('second'));
    storage.insert(makeEvent('third'));

    const list = storage.list();
    expect(list[0].id).toBe('third');
    expect(list[1].id).toBe('second');
    expect(list[2].id).toBe('first');
  });

  it('list returns a copy – mutating the returned array does not affect storage', () => {
    storage.insert(makeEvent('shot-1'));
    const list = storage.list();
    list.splice(0, list.length); // empty the returned copy
    expect(storage.list()).toHaveLength(1);
  });

  it('accumulates multiple events', () => {
    for (let i = 0; i < 5; i++) {
      storage.insert(makeEvent(`shot-${i}`));
    }
    expect(storage.list()).toHaveLength(5);
  });

  it('insert is idempotent in the sense that inserting the same object twice creates two entries', () => {
    const event = makeEvent('dup');
    storage.insert(event);
    storage.insert(event);
    expect(storage.list()).toHaveLength(2);
  });

  it('two independent storage instances do not share events', () => {
    const storageA = new InMemoryScreenshotStorage();
    const storageB = new InMemoryScreenshotStorage();

    storageA.insert(makeEvent('a-only'));

    expect(storageA.list()).toHaveLength(1);
    expect(storageB.list()).toHaveLength(0);
  });

  it('list() preserves all event fields of the inserted event', () => {
    const event = makeEvent('full-event');
    event.windowTitle = 'Test Window';
    event.ocrText = 'some text';
    event.anomalies = ['error'];
    event.taskClues = ['deploy'];
    event.entities = ['VSCode'];
    event.linkedTimelineEntryIds = ['entry-1'];

    storage.insert(event);
    const result = storage.list()[0];

    expect(result.windowTitle).toBe('Test Window');
    expect(result.ocrText).toBe('some text');
    expect(result.anomalies).toEqual(['error']);
    expect(result.taskClues).toEqual(['deploy']);
    expect(result.entities).toEqual(['VSCode']);
    expect(result.linkedTimelineEntryIds).toEqual(['entry-1']);
  });
});