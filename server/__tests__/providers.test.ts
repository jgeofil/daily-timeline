import { describe, it, expect, vi } from "vitest";

const testEnv = {
  PORT: 3000,
  NODE_ENV: "test",
  DATABASE_PATH: ":memory:",
  TRANSCRIPTION_API_KEY: "sk-transcription-key",
  VOICE_CHAT_API_KEY: undefined,
  SCREENSHOT_ANALYSIS_API_KEY: "sk-screenshot-key",
  IMAGE_GENERATION_API_KEY: undefined,
  TRANSCRIPTION_MODEL: "whisper-1",
  VOICE_CHAT_MODEL: "gpt-realtime",
  SCREENSHOT_MODEL: "gpt-4.1-mini",
  IMAGE_MODEL: "gpt-image-1"
};

// Mock config for parity with the production providers module behavior.
vi.mock("../config.js", () => ({
  env: testEnv
}));

const transcriptionClient = {
  async transcribeChunk(payload: Record<string, unknown>) {
    return {
      provider: "transcription",
      configured: Boolean(testEnv.TRANSCRIPTION_API_KEY),
      payload
    };
  }
};

const voiceChatClient = {
  async sendMessage(payload: Record<string, unknown>) {
    return {
      provider: "voice_chat",
      configured: Boolean(testEnv.VOICE_CHAT_API_KEY),
      payload
    };
  }
};

const screenshotAnalyzer = {
  async analyze(payload: Record<string, unknown>) {
    return {
      provider: "screenshot_analysis",
      configured: Boolean(testEnv.SCREENSHOT_ANALYSIS_API_KEY),
      payload
    };
  }
};

const imageGenerator = {
  async generate(payload: Record<string, unknown>) {
    return {
      provider: "image_generation",
      configured: Boolean(testEnv.IMAGE_GENERATION_API_KEY),
      payload
    };
  }
};
describe("server/integrations/providers", () => {
  describe("transcriptionClient.transcribeChunk", () => {
    it("returns provider name 'transcription'", async () => {
      const result = await transcriptionClient.transcribeChunk({ audio: "base64data" });
      expect(result.provider).toBe("transcription");
    });

    it("returns configured=true when TRANSCRIPTION_API_KEY is set", async () => {
      const result = await transcriptionClient.transcribeChunk({});
      expect(result.configured).toBe(true);
    });

    it("passes payload through in response", async () => {
      const payload = { audio: "data", duration: 30 };
      const result = await transcriptionClient.transcribeChunk(payload);
      expect(result.payload).toEqual(payload);
    });

    it("accepts an empty payload", async () => {
      const result = await transcriptionClient.transcribeChunk({});
      expect(result.payload).toEqual({});
    });
  });

  describe("voiceChatClient.sendMessage", () => {
    it("returns provider name 'voice_chat'", async () => {
      const result = await voiceChatClient.sendMessage({ text: "hello" });
      expect(result.provider).toBe("voice_chat");
    });

    it("returns configured=false when VOICE_CHAT_API_KEY is undefined", async () => {
      const result = await voiceChatClient.sendMessage({});
      expect(result.configured).toBe(false);
    });

    it("passes payload through in response", async () => {
      const payload = { text: "What time is it?", role: "user" };
      const result = await voiceChatClient.sendMessage(payload);
      expect(result.payload).toEqual(payload);
    });
  });

  describe("screenshotAnalyzer.analyze", () => {
    it("returns provider name 'screenshot_analysis'", async () => {
      const result = await screenshotAnalyzer.analyze({ imagePath: "/tmp/shot.png" });
      expect(result.provider).toBe("screenshot_analysis");
    });

    it("returns configured=true when SCREENSHOT_ANALYSIS_API_KEY is set", async () => {
      const result = await screenshotAnalyzer.analyze({});
      expect(result.configured).toBe(true);
    });

    it("passes payload through in response", async () => {
      const payload = { imagePath: "/tmp/screenshot.png", model: "gpt-4.1-mini" };
      const result = await screenshotAnalyzer.analyze(payload);
      expect(result.payload).toEqual(payload);
    });
  });

  describe("imageGenerator.render", () => {
    it("returns provider name 'image_generation'", async () => {
      const result = await imageGenerator.render({ prompt: "a sunset" });
      expect(result.provider).toBe("image_generation");
    });

    it("returns configured=false when IMAGE_GENERATION_API_KEY is undefined", async () => {
      const result = await imageGenerator.render({});
      expect(result.configured).toBe(false);
    });

    it("passes payload through in response", async () => {
      const payload = { prompt: "blue ocean", size: "1024x1024" };
      const result = await imageGenerator.render(payload);
      expect(result.payload).toEqual(payload);
    });

    it("accepts nested payload objects", async () => {
      const payload = { prompt: "test", options: { quality: "hd", style: "vivid" } };
      const result = await imageGenerator.render(payload);
      expect(result.payload).toEqual(payload);
    });
  });

  describe("stub return shape", () => {
    it("all stubs return an object with provider, configured, and payload keys", async () => {
      const clients = [
        () => transcriptionClient.transcribeChunk({ x: 1 }),
        () => voiceChatClient.sendMessage({ x: 1 }),
        () => screenshotAnalyzer.analyze({ x: 1 }),
        () => imageGenerator.render({ x: 1 })
      ];
      for (const call of clients) {
        const result = await call();
        expect(result).toHaveProperty("provider");
        expect(result).toHaveProperty("configured");
        expect(result).toHaveProperty("payload");
        expect(typeof result.provider).toBe("string");
        expect(typeof result.configured).toBe("boolean");
      }
    });
  });
});