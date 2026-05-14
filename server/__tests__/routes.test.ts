import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DailySession, Insight, TimestampedEvent } from "../../shared/models.js";
import type { Request, Response } from "express";

// Mock the full dependency chain to avoid native sqlite3 build
vi.mock("better-sqlite3", () => {
  function MockDatabase() {
    return {
      pragma: function() {},
      exec: function() {},
      prepare: function() {
        return { run: function() {}, all: function() { return []; } };
      }
    };
  }
  return { default: MockDatabase };
});

vi.mock("../config.js", () => ({
  env: {
    PORT: 3000,
    NODE_ENV: "test",
    DATABASE_PATH: ":memory:",
    TRANSCRIPTION_MODEL: "whisper-1",
    VOICE_CHAT_MODEL: "gpt-realtime",
    SCREENSHOT_MODEL: "gpt-4.1-mini",
    IMAGE_MODEL: "gpt-image-1"
  }
}));

// Mock repositories to avoid DB dependency
vi.mock("../storage/repositories.js", () => ({
  createSession: vi.fn(),
  listSessions: vi.fn(),
  appendEvent: vi.fn(),
  appendInsight: vi.fn(),
  listInsights: vi.fn()
}));

import {
  createSession,
  listSessions,
  appendEvent,
  appendInsight,
  listInsights
} from "../storage/repositories.js";

// Helper to create mock req/res objects
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides
  } as unknown as Request;
}

type MockResponseState = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
};

function mockRes(): Response & { _state: MockResponseState } {
  const state: MockResponseState = { statusCode: 200, body: undefined, headers: {} };
  const res = {
    _state: state,
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(data: unknown) {
      state.body = data;
      return res;
    },
    set(key: string, value: string) {
      state.headers[key] = value;
      return res;
    }
  };
  return res as unknown as Response & { _state: MockResponseState };
}

// Import routers to extract route handlers
// We'll test by getting the route layer functions
import { sessionsRouter } from "../routes/sessions.js";
import { eventsRouter } from "../routes/events.js";

// Extract route handlers from express Router stack
function getHandler(router: ReturnType<typeof import("express").Router>, method: string, path: string) {
  const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: (...args: unknown[]) => void }> } }> }).stack;
  for (const layer of stack) {
    if (layer.route && layer.route.path === path && layer.route.methods[method.toLowerCase()]) {
      return layer.route.stack[0].handle;
    }
  }
  return null;
}

const mockSession: DailySession = {
  id: "sess-uuid-1",
  date: "2024-01-15",
  startedAt: "2024-01-15T08:00:00Z",
  timezone: "UTC",
  status: "active"
};

const mockInsight: Insight = {
  id: "insight-uuid-1",
  sessionId: "sess-uuid-1",
  createdAt: "2024-01-15T10:00:00Z",
  kind: "summary",
  content: "Good session",
  sourceEventIds: []
};

const mockEvent: TimestampedEvent = {
  id: "evt-uuid-1",
  sessionId: "sess-uuid-1",
  eventType: "activity",
  occurredAt: "2024-01-15T09:00:00Z",
  payload: { source: "desktop" }
};

describe("server/routes/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET / (list sessions)", () => {
    it("returns list of sessions from listSessions", () => {
      vi.mocked(listSessions).mockReturnValueOnce([mockSession]);
      const handler = getHandler(sessionsRouter, "get", "/");
      expect(handler).not.toBeNull();
      const req = mockReq();
      const res = mockRes();
      handler!(req, res, () => {});
      expect(listSessions).toHaveBeenCalledOnce();
      expect(res._state.body).toEqual([mockSession]);
    });

    it("returns empty array when no sessions exist", () => {
      vi.mocked(listSessions).mockReturnValueOnce([]);
      const handler = getHandler(sessionsRouter, "get", "/");
      const req = mockReq();
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.body).toEqual([]);
    });

    it("returns multiple sessions", () => {
      const session2: DailySession = { ...mockSession, id: "sess-2", status: "review" };
      vi.mocked(listSessions).mockReturnValueOnce([mockSession, session2]);
      const handler = getHandler(sessionsRouter, "get", "/");
      const req = mockReq();
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.body).toHaveLength(2);
    });
  });

  describe("POST / (create session)", () => {
    it("returns 201 status on creation", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: { timezone: "UTC", status: "active" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.statusCode).toBe(201);
    });

    it("returns the created session", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: { timezone: "UTC", status: "active" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.body).toEqual(mockSession);
    });

    it("passes timezone from body to createSession", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: { timezone: "America/Chicago" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(createSession).mock.calls[0][0].timezone).toBe("America/Chicago");
    });

    it("defaults timezone to 'UTC' when absent", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: {} });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(createSession).mock.calls[0][0].timezone).toBe("UTC");
    });

    it("defaults status to 'active' when absent", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: { timezone: "UTC" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(createSession).mock.calls[0][0].status).toBe("active");
    });

    it("uses provided date when given", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: { date: "2024-06-15", timezone: "UTC" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(createSession).mock.calls[0][0].date).toBe("2024-06-15");
    });

    it("defaults date to today (YYYY-MM-DD) when absent", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: { timezone: "UTC" } });
      const res = mockRes();
      handler!(req, res, () => {});
      const date = vi.mocked(createSession).mock.calls[0][0].date;
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("passes projectContextId when provided", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: { timezone: "UTC", projectContextId: "proj-abc" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(createSession).mock.calls[0][0].projectContextId).toBe("proj-abc");
    });

    it("passes endedAt when provided", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: { timezone: "UTC", endedAt: "2024-01-15T17:00:00Z" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(createSession).mock.calls[0][0].endedAt).toBe("2024-01-15T17:00:00Z");
    });

    it("calls createSession exactly once", () => {
      vi.mocked(createSession).mockReturnValueOnce(mockSession);
      const handler = getHandler(sessionsRouter, "post", "/");
      const req = mockReq({ body: {} });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(createSession).toHaveBeenCalledOnce();
    });
  });
});

describe("server/routes/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /events", () => {
    it("returns 201 status on event creation", () => {
      vi.mocked(appendEvent).mockReturnValueOnce(mockEvent);
      const handler = getHandler(eventsRouter, "post", "/events");
      const req = mockReq({ body: { sessionId: "sess-1", eventType: "activity", payload: {} } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.statusCode).toBe(201);
    });

    it("returns the created event", () => {
      vi.mocked(appendEvent).mockReturnValueOnce(mockEvent);
      const handler = getHandler(eventsRouter, "post", "/events");
      const req = mockReq({ body: { sessionId: "sess-1", eventType: "activity", payload: {} } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.body).toEqual(mockEvent);
    });

    it("passes sessionId and eventType to appendEvent", () => {
      vi.mocked(appendEvent).mockReturnValueOnce(mockEvent);
      const handler = getHandler(eventsRouter, "post", "/events");
      const req = mockReq({ body: { sessionId: "sess-99", eventType: "voice", payload: {} } });
      const res = mockRes();
      handler!(req, res, () => {});
      const call = vi.mocked(appendEvent).mock.calls[0][0];
      expect(call.sessionId).toBe("sess-99");
      expect(call.eventType).toBe("voice");
    });

    it("passes payload to appendEvent", () => {
      vi.mocked(appendEvent).mockReturnValueOnce(mockEvent);
      const handler = getHandler(eventsRouter, "post", "/events");
      const payload = { app: "vscode", file: "index.ts" };
      const req = mockReq({ body: { sessionId: "sess-1", eventType: "activity", payload } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(appendEvent).mock.calls[0][0].payload).toEqual(payload);
    });

    it("defaults payload to {} when not provided", () => {
      vi.mocked(appendEvent).mockReturnValueOnce(mockEvent);
      const handler = getHandler(eventsRouter, "post", "/events");
      const req = mockReq({ body: { sessionId: "sess-1", eventType: "system" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(appendEvent).mock.calls[0][0].payload).toEqual({});
    });

    it("uses provided occurredAt", () => {
      vi.mocked(appendEvent).mockReturnValueOnce(mockEvent);
      const handler = getHandler(eventsRouter, "post", "/events");
      const req = mockReq({ body: { sessionId: "sess-1", eventType: "note", occurredAt: "2024-01-15T09:30:00Z" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(appendEvent).mock.calls[0][0].occurredAt).toBe("2024-01-15T09:30:00Z");
    });

    it("defaults occurredAt to current ISO time when absent", () => {
      vi.mocked(appendEvent).mockReturnValueOnce(mockEvent);
      const handler = getHandler(eventsRouter, "post", "/events");
      const before = new Date().toISOString();
      const req = mockReq({ body: { sessionId: "sess-1", eventType: "note" } });
      const res = mockRes();
      handler!(req, res, () => {});
      const after = new Date().toISOString();
      const occurredAt = vi.mocked(appendEvent).mock.calls[0][0].occurredAt;
      expect(occurredAt >= before).toBe(true);
      expect(occurredAt <= after).toBe(true);
    });
  });

  describe("POST /insights", () => {
    it("returns 201 status on insight creation", () => {
      vi.mocked(appendInsight).mockReturnValueOnce(mockInsight);
      const handler = getHandler(eventsRouter, "post", "/insights");
      const req = mockReq({ body: { sessionId: "sess-1", content: "Great session" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.statusCode).toBe(201);
    });

    it("returns the created insight", () => {
      vi.mocked(appendInsight).mockReturnValueOnce(mockInsight);
      const handler = getHandler(eventsRouter, "post", "/insights");
      const req = mockReq({ body: { sessionId: "sess-1", content: "Great session" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.body).toEqual(mockInsight);
    });

    it("passes sessionId and content to appendInsight", () => {
      vi.mocked(appendInsight).mockReturnValueOnce(mockInsight);
      const handler = getHandler(eventsRouter, "post", "/insights");
      const req = mockReq({ body: { sessionId: "sess-99", content: "Deep work" } });
      const res = mockRes();
      handler!(req, res, () => {});
      const call = vi.mocked(appendInsight).mock.calls[0][0];
      expect(call.sessionId).toBe("sess-99");
      expect(call.content).toBe("Deep work");
    });

    it("defaults kind to 'summary' when absent", () => {
      vi.mocked(appendInsight).mockReturnValueOnce(mockInsight);
      const handler = getHandler(eventsRouter, "post", "/insights");
      const req = mockReq({ body: { sessionId: "sess-1", content: "Test" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(appendInsight).mock.calls[0][0].kind).toBe("summary");
    });

    it("uses provided kind", () => {
      vi.mocked(appendInsight).mockReturnValueOnce(mockInsight);
      const handler = getHandler(eventsRouter, "post", "/insights");
      const req = mockReq({ body: { sessionId: "sess-1", content: "Risk", kind: "risk" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(appendInsight).mock.calls[0][0].kind).toBe("risk");
    });

    it("defaults sourceEventIds to [] when absent", () => {
      vi.mocked(appendInsight).mockReturnValueOnce(mockInsight);
      const handler = getHandler(eventsRouter, "post", "/insights");
      const req = mockReq({ body: { sessionId: "sess-1", content: "Test" } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(appendInsight).mock.calls[0][0].sourceEventIds).toEqual([]);
    });

    it("uses provided sourceEventIds", () => {
      vi.mocked(appendInsight).mockReturnValueOnce(mockInsight);
      const handler = getHandler(eventsRouter, "post", "/insights");
      const req = mockReq({ body: { sessionId: "sess-1", content: "Pattern", sourceEventIds: ["e1", "e2"] } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(appendInsight).mock.calls[0][0].sourceEventIds).toEqual(["e1", "e2"]);
    });

    it("passes score when provided", () => {
      vi.mocked(appendInsight).mockReturnValueOnce(mockInsight);
      const handler = getHandler(eventsRouter, "post", "/insights");
      const req = mockReq({ body: { sessionId: "sess-1", content: "High confidence", score: 0.95 } });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(vi.mocked(appendInsight).mock.calls[0][0].score).toBe(0.95);
    });
  });

  describe("GET /insights/:sessionId", () => {
    it("returns insights for the given session", () => {
      vi.mocked(listInsights).mockReturnValueOnce([mockInsight]);
      const handler = getHandler(eventsRouter, "get", "/insights/:sessionId");
      const req = mockReq({ params: { sessionId: "sess-uuid-1" } as unknown as Record<string, string> });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.body).toEqual([mockInsight]);
    });

    it("calls listInsights with the correct sessionId", () => {
      vi.mocked(listInsights).mockReturnValueOnce([]);
      const handler = getHandler(eventsRouter, "get", "/insights/:sessionId");
      const req = mockReq({ params: { sessionId: "my-session-id" } as unknown as Record<string, string> });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(listInsights).toHaveBeenCalledWith("my-session-id");
    });

    it("returns empty array when no insights exist", () => {
      vi.mocked(listInsights).mockReturnValueOnce([]);
      const handler = getHandler(eventsRouter, "get", "/insights/:sessionId");
      const req = mockReq({ params: { sessionId: "unknown-session" } as unknown as Record<string, string> });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.body).toEqual([]);
    });

    it("returns multiple insights when present", () => {
      const insight2: Insight = { ...mockInsight, id: "ins-2", kind: "task" };
      vi.mocked(listInsights).mockReturnValueOnce([mockInsight, insight2]);
      const handler = getHandler(eventsRouter, "get", "/insights/:sessionId");
      const req = mockReq({ params: { sessionId: "sess-uuid-1" } as unknown as Record<string, string> });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.body).toHaveLength(2);
    });

    it("returns status 200 by default", () => {
      vi.mocked(listInsights).mockReturnValueOnce([]);
      const handler = getHandler(eventsRouter, "get", "/insights/:sessionId");
      const req = mockReq({ params: { sessionId: "sess-1" } as unknown as Record<string, string> });
      const res = mockRes();
      handler!(req, res, () => {});
      expect(res._state.statusCode).toBe(200);
    });
  });
});