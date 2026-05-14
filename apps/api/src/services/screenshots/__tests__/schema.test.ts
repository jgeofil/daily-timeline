import { describe, expect, it } from 'vitest';
import { ScreenshotIngestionSchema } from '../schema';

const validBase = {
  imageUrl: 'https://storage.example.com/screenshots/1.png',
  capturedAt: '2024-01-15T09:00:00.000Z',
  userId: 'user-123',
};

describe('ScreenshotIngestionSchema', () => {
  it('accepts a minimal valid payload (required fields only)', () => {
    const result = ScreenshotIngestionSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated valid payload', () => {
    const result = ScreenshotIngestionSchema.safeParse({
      ...validBase,
      windowTitle: 'VSCode – timeline project',
      hintedText: 'TODO fix the regression',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.windowTitle).toBe('VSCode – timeline project');
      expect(result.data.hintedText).toBe('TODO fix the regression');
    }
  });

  it('rejects when imageUrl is not a valid URL', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, imageUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects when capturedAt is not an ISO datetime string', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, capturedAt: '2024-01-15' });
    expect(result.success).toBe(false);
  });

  it('rejects when userId is missing', () => {
    const { userId: _, ...withoutUserId } = validBase;
    const result = ScreenshotIngestionSchema.safeParse(withoutUserId);
    expect(result.success).toBe(false);
  });

  it('rejects when userId is an empty string', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, userId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects when imageUrl is missing', () => {
    const { imageUrl: _, ...withoutUrl } = validBase;
    const result = ScreenshotIngestionSchema.safeParse(withoutUrl);
    expect(result.success).toBe(false);
  });

  it('rejects when capturedAt is missing', () => {
    const { capturedAt: _, ...withoutCaptured } = validBase;
    const result = ScreenshotIngestionSchema.safeParse(withoutCaptured);
    expect(result.success).toBe(false);
  });

  it('accepts null windowTitle', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, windowTitle: null });
    expect(result.success).toBe(true);
  });

  it('accepts null hintedText', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, hintedText: null });
    expect(result.success).toBe(true);
  });

  it('rejects windowTitle that is an empty string (min(1))', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, windowTitle: '' });
    expect(result.success).toBe(false);
  });

  it('rejects hintedText that is an empty string (min(1))', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, hintedText: '' });
    expect(result.success).toBe(false);
  });

  it('omitting optional windowTitle and hintedText still passes', () => {
    const result = ScreenshotIngestionSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.windowTitle).toBeUndefined();
      expect(result.data.hintedText).toBeUndefined();
    }
  });

  it('rejects entirely non-string imageUrl', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, imageUrl: 12345 });
    expect(result.success).toBe(false);
  });

  it('error details include the failing field path on invalid payload', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, imageUrl: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('imageUrl');
    }
  });

  it('rejects capturedAt that is a date-only string (missing time portion)', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, capturedAt: '2024-01-15' });
    expect(result.success).toBe(false);
  });

  it('rejects capturedAt that is an arbitrary non-datetime string', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, capturedAt: 'tomorrow' });
    expect(result.success).toBe(false);
  });

  it('accepts http imageUrl (not only https)', () => {
    const result = ScreenshotIngestionSchema.safeParse({
      ...validBase,
      imageUrl: 'http://storage.example.com/screenshots/1.png',
    });
    expect(result.success).toBe(true);
  });

  it('rejects payload where imageUrl is null', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, imageUrl: null });
    expect(result.success).toBe(false);
  });

  it('rejects payload where userId is null', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, userId: null });
    expect(result.success).toBe(false);
  });

  it('windowTitle with a single non-empty character passes', () => {
    const result = ScreenshotIngestionSchema.safeParse({ ...validBase, windowTitle: 'A' });
    expect(result.success).toBe(true);
  });
});