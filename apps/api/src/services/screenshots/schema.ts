import { z } from 'zod';

export const ScreenshotIngestionSchema = z.object({
  imageUrl: z.string().url(),
  capturedAt: z.string().datetime(),
  windowTitle: z.string().min(1).nullable().optional(),
  hintedText: z.string().min(1).nullable().optional(),
  userId: z.string().min(1),
});

export type ScreenshotIngestionInput = z.infer<typeof ScreenshotIngestionSchema>;
