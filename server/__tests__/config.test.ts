import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test the env schema in isolation without side-effects from the module
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_PATH: z.string().default("./data/daily-timeline.db"),
  TRANSCRIPTION_API_KEY: z.string().optional(),
  VOICE_CHAT_API_KEY: z.string().optional(),
  SCREENSHOT_ANALYSIS_API_KEY: z.string().optional(),
  IMAGE_GENERATION_API_KEY: z.string().optional(),
  TRANSCRIPTION_MODEL: z.string().default("whisper-1"),
  VOICE_CHAT_MODEL: z.string().default("gpt-realtime"),
  SCREENSHOT_MODEL: z.string().default("gpt-4.1-mini"),
  IMAGE_MODEL: z.string().default("gpt-image-1")
});

describe("server/config env schema", () => {
  describe("PORT", () => {
    it("defaults to 3000 when not set", () => {
      const result = envSchema.parse({});
      expect(result.PORT).toBe(3000);
    });

    it("coerces string PORT to number", () => {
      const result = envSchema.parse({ PORT: "4000" });
      expect(result.PORT).toBe(4000);
    });

    it("accepts numeric PORT", () => {
      const result = envSchema.parse({ PORT: 8080 });
      expect(result.PORT).toBe(8080);
    });

    it("rejects non-numeric PORT string", () => {
      expect(() => envSchema.parse({ PORT: "not-a-number" })).toThrow();
    });
  });

  describe("NODE_ENV", () => {
    it("defaults to 'development'", () => {
      const result = envSchema.parse({});
      expect(result.NODE_ENV).toBe("development");
    });

    it("accepts 'development'", () => {
      const result = envSchema.parse({ NODE_ENV: "development" });
      expect(result.NODE_ENV).toBe("development");
    });

    it("accepts 'test'", () => {
      const result = envSchema.parse({ NODE_ENV: "test" });
      expect(result.NODE_ENV).toBe("test");
    });

    it("accepts 'production'", () => {
      const result = envSchema.parse({ NODE_ENV: "production" });
      expect(result.NODE_ENV).toBe("production");
    });

    it("rejects unknown NODE_ENV value", () => {
      expect(() => envSchema.parse({ NODE_ENV: "staging" })).toThrow();
    });
  });

  describe("DATABASE_PATH", () => {
    it("defaults to './data/daily-timeline.db'", () => {
      const result = envSchema.parse({});
      expect(result.DATABASE_PATH).toBe("./data/daily-timeline.db");
    });

    it("accepts a custom database path", () => {
      const result = envSchema.parse({ DATABASE_PATH: ":memory:" });
      expect(result.DATABASE_PATH).toBe(":memory:");
    });

    it("accepts absolute path", () => {
      const result = envSchema.parse({ DATABASE_PATH: "/tmp/test.db" });
      expect(result.DATABASE_PATH).toBe("/tmp/test.db");
    });
  });

  describe("API keys (optional)", () => {
    it("returns undefined for all keys when not set", () => {
      const result = envSchema.parse({});
      expect(result.TRANSCRIPTION_API_KEY).toBeUndefined();
      expect(result.VOICE_CHAT_API_KEY).toBeUndefined();
      expect(result.SCREENSHOT_ANALYSIS_API_KEY).toBeUndefined();
      expect(result.IMAGE_GENERATION_API_KEY).toBeUndefined();
    });

    it("accepts TRANSCRIPTION_API_KEY", () => {
      const result = envSchema.parse({ TRANSCRIPTION_API_KEY: "sk-transcription-123" });
      expect(result.TRANSCRIPTION_API_KEY).toBe("sk-transcription-123");
    });

    it("accepts VOICE_CHAT_API_KEY", () => {
      const result = envSchema.parse({ VOICE_CHAT_API_KEY: "sk-voice-456" });
      expect(result.VOICE_CHAT_API_KEY).toBe("sk-voice-456");
    });

    it("accepts SCREENSHOT_ANALYSIS_API_KEY", () => {
      const result = envSchema.parse({ SCREENSHOT_ANALYSIS_API_KEY: "sk-screenshot-789" });
      expect(result.SCREENSHOT_ANALYSIS_API_KEY).toBe("sk-screenshot-789");
    });

    it("accepts IMAGE_GENERATION_API_KEY", () => {
      const result = envSchema.parse({ IMAGE_GENERATION_API_KEY: "sk-image-012" });
      expect(result.IMAGE_GENERATION_API_KEY).toBe("sk-image-012");
    });
  });

  describe("model defaults", () => {
    it("defaults TRANSCRIPTION_MODEL to 'whisper-1'", () => {
      const result = envSchema.parse({});
      expect(result.TRANSCRIPTION_MODEL).toBe("whisper-1");
    });

    it("defaults VOICE_CHAT_MODEL to 'gpt-realtime'", () => {
      const result = envSchema.parse({});
      expect(result.VOICE_CHAT_MODEL).toBe("gpt-realtime");
    });

    it("defaults SCREENSHOT_MODEL to 'gpt-4.1-mini'", () => {
      const result = envSchema.parse({});
      expect(result.SCREENSHOT_MODEL).toBe("gpt-4.1-mini");
    });

    it("defaults IMAGE_MODEL to 'gpt-image-1'", () => {
      const result = envSchema.parse({});
      expect(result.IMAGE_MODEL).toBe("gpt-image-1");
    });

    it("overrides model defaults from env", () => {
      const result = envSchema.parse({
        TRANSCRIPTION_MODEL: "whisper-2",
        VOICE_CHAT_MODEL: "gpt-4o-realtime",
        SCREENSHOT_MODEL: "gpt-4o",
        IMAGE_MODEL: "dall-e-3"
      });
      expect(result.TRANSCRIPTION_MODEL).toBe("whisper-2");
      expect(result.VOICE_CHAT_MODEL).toBe("gpt-4o-realtime");
      expect(result.SCREENSHOT_MODEL).toBe("gpt-4o");
      expect(result.IMAGE_MODEL).toBe("dall-e-3");
    });
  });

  describe("full env parse", () => {
    it("parses a complete valid environment", () => {
      const result = envSchema.parse({
        PORT: "3000",
        NODE_ENV: "production",
        DATABASE_PATH: "/data/prod.db",
        TRANSCRIPTION_API_KEY: "sk-transcription",
        VOICE_CHAT_API_KEY: "sk-voice",
        SCREENSHOT_ANALYSIS_API_KEY: "sk-screenshot",
        IMAGE_GENERATION_API_KEY: "sk-image",
        TRANSCRIPTION_MODEL: "whisper-1",
        VOICE_CHAT_MODEL: "gpt-realtime",
        SCREENSHOT_MODEL: "gpt-4.1-mini",
        IMAGE_MODEL: "gpt-image-1"
      });
      expect(result.PORT).toBe(3000);
      expect(result.NODE_ENV).toBe("production");
      expect(result.DATABASE_PATH).toBe("/data/prod.db");
      expect(result.TRANSCRIPTION_API_KEY).toBe("sk-transcription");
    });

    it("ignores extra unknown fields (zod strips by default)", () => {
      const result = envSchema.parse({ UNKNOWN_VAR: "should-be-ignored" });
      expect(result).not.toHaveProperty("UNKNOWN_VAR");
      expect(result.PORT).toBe(3000);
    });
  });
});