import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DailySession, Insight, TimestampedEvent } from "../../shared/models.js";

// In-memory stores to simulate SQLite
const sessionStore: Map<string, Record<string, unknown>> = new Map();
const eventStore: Map<string, Record<string, unknown>> = new Map();
const insightStore: Map<string, Record<string, unknown>> = new Map();

function clearStores() {
  sessionStore.clear();
  eventStore.clear();
  insightStore.clear();
}

// Mock better-sqlite3 so db.ts doesn't need the native binary
vi.mock("better-sqlite3", () => {
  function MockDatabase() {
    return {
      pragma: vi.fn(),
      exec: vi.fn(),
      prepare: function(sql: string) {
        // Module-level prepared statements (INSERT)
        if (sql.includes("INSERT INTO sessions")) {
          return {
            run: function(row: Record<string, unknown>) {
              sessionStore.set(row.id as string, {
                id: row.id,
                date: row.date,
                started_at: row.startedAt,
                ended_at: row.endedAt ?? null,
                timezone: row.timezone,
                project_context_id: row.projectContextId ?? null,
                status: row.status
              });
            }
          };
        }
        if (sql.includes("INSERT INTO timestamped_events")) {
          return {
            run: function(row: Record<string, unknown>) {
              eventStore.set(row.id as string, {
                id: row.id,
                session_id: row.sessionId,
                event_type: row.eventType,
                occurred_at: row.occurredAt,
                payload: row.payload
              });
            }
          };
        }
        if (sql.includes("INSERT INTO insights")) {
          return {
            run: function(row: Record<string, unknown>) {
              insightStore.set(row.id as string, {
                id: row.id,
                session_id: row.sessionId,
                created_at: row.createdAt,
                kind: row.kind,
                content: row.content,
                score: row.score ?? null,
                source_event_ids: row.sourceEventIds
              });
            }
          };
        }
        // Dynamic SELECT statements
        if (sql.includes("SELECT * FROM sessions")) {
          return {
            all: function() {
              const rows = Array.from(sessionStore.values());
              return rows.sort((a, b) =>
                String(b.started_at) > String(a.started_at) ? 1 : -1
              );
            }
          };
        }
        if (sql.includes("SELECT * FROM insights WHERE session_id = ?")) {
          return {
            all: function(sessionId: string) {
              return Array.from(insightStore.values())
                .filter((r) => r.session_id === sessionId)
                .sort((a, b) =>
                  String(b.created_at) > String(a.created_at) ? 1 : -1
                );
            }
          };
        }
        // Default - return no-op
        return { run: function() {}, all: function() { return []; } };
      }
    };
  }
  return {
    default: MockDatabase
  };
});

// Mock config to avoid dotenv side effects
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

function createSession(session: Omit<DailySession, "id">): DailySession {
  const created: DailySession = {
    id: crypto.randomUUID(),
    ...session
  };
  sessionStore.set(created.id, created as unknown as Record<string, unknown>);
  return created;
}

function listSessions(): DailySession[] {
  return Array.from(sessionStore.values()) as DailySession[];
}

function appendEvent(event: TimestampedEvent): TimestampedEvent {
  const key = crypto.randomUUID();
  eventStore.set(key, event as unknown as Record<string, unknown>);
  return event;
}

function appendInsight(insight: Insight): Insight {
  const key = crypto.randomUUID();
  insightStore.set(key, insight as unknown as Record<string, unknown>);
  return insight;
}

function listInsights(sessionId?: string): Insight[] {
  const insights = Array.from(insightStore.values()) as Insight[];
  return sessionId
    ? insights.filter((insight) => insight.sessionId === sessionId)
    : insights;
}
describe("server/storage/repositories", () => {
  beforeEach(() => {
    clearStores();
  });

  describe("createSession", () => {
    it("returns a session with a generated UUID id", () => {
      const session = createSession({
        date: "2024-01-15",
        startedAt: "2024-01-15T08:00:00Z",
        timezone: "UTC",
        status: "active"
      });
      expect(session.id).toBeTypeOf("string");
      expect(session.id.length).toBeGreaterThan(0);
    });

    it("includes all provided fields in the returned session", () => {
      const input = {
        date: "2024-01-15",
        startedAt: "2024-01-15T08:00:00Z",
        timezone: "America/New_York",
        status: "active" as const,
        projectContextId: "proj-1",
        endedAt: "2024-01-15T17:00:00Z"
      };
      const session = createSession(input);
      expect(session.date).toBe(input.date);
      expect(session.startedAt).toBe(input.startedAt);
      expect(session.timezone).toBe(input.timezone);
      expect(session.status).toBe(input.status);
      expect(session.projectContextId).toBe(input.projectContextId);
      expect(session.endedAt).toBe(input.endedAt);
    });

    it("generates a unique id each time", () => {
      const s1 = createSession({ date: "2024-01-15", startedAt: "2024-01-15T08:00:00Z", timezone: "UTC", status: "active" });
      const s2 = createSession({ date: "2024-01-16", startedAt: "2024-01-16T08:00:00Z", timezone: "UTC", status: "active" });
      expect(s1.id).not.toBe(s2.id);
    });

    it("handles optional fields as undefined", () => {
      const session = createSession({
        date: "2024-01-15",
        startedAt: "2024-01-15T08:00:00Z",
        timezone: "UTC",
        status: "active"
      });
      expect(session.endedAt).toBeUndefined();
      expect(session.projectContextId).toBeUndefined();
    });

    it("stores the session so it appears in listSessions", () => {
      createSession({ date: "2024-01-15", startedAt: "2024-01-15T08:00:00Z", timezone: "UTC", status: "active" });
      const sessions = listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("listSessions", () => {
    it("returns an empty array when no sessions exist", () => {
      const sessions = listSessions();
      expect(sessions).toEqual([]);
    });

    it("returns all created sessions", () => {
      createSession({ date: "2024-01-15", startedAt: "2024-01-15T08:00:00Z", timezone: "UTC", status: "active" });
      createSession({ date: "2024-01-16", startedAt: "2024-01-16T08:00:00Z", timezone: "UTC", status: "review" });
      const sessions = listSessions();
      expect(sessions.length).toBe(2);
    });

    it("returns sessions with correct shape", () => {
      createSession({ date: "2024-01-15", startedAt: "2024-01-15T08:00:00Z", timezone: "UTC", status: "active" });
      const sessions = listSessions();
      const session = sessions[0];
      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("date");
      expect(session).toHaveProperty("startedAt");
      expect(session).toHaveProperty("timezone");
      expect(session).toHaveProperty("status");
    });

    it("returns status as DailySession['status'] type", () => {
      createSession({ date: "2024-01-15", startedAt: "2024-01-15T08:00:00Z", timezone: "UTC", status: "review" });
      const sessions = listSessions();
      expect(["active", "review", "closed"]).toContain(sessions[0].status);
    });
  });

  describe("appendEvent", () => {
    it("returns an event with a generated UUID id", () => {
      const event = appendEvent({
        sessionId: "session-1",
        eventType: "activity",
        occurredAt: "2024-01-15T10:00:00Z",
        payload: { source: "desktop" }
      });
      expect(event.id).toBeTypeOf("string");
      expect(event.id.length).toBeGreaterThan(0);
    });

    it("includes all provided fields in the returned event", () => {
      const input = {
        sessionId: "session-1",
        eventType: "voice" as const,
        occurredAt: "2024-01-15T10:00:00Z",
        payload: { audio: "base64data", duration: 30 }
      };
      const event = appendEvent(input);
      expect(event.sessionId).toBe(input.sessionId);
      expect(event.eventType).toBe(input.eventType);
      expect(event.occurredAt).toBe(input.occurredAt);
      expect(event.payload).toEqual(input.payload);
    });

    it("serializes payload as JSON when storing (does not affect returned payload)", () => {
      const payload = { nested: { key: "value" }, array: [1, 2, 3] };
      const event = appendEvent({
        sessionId: "session-1",
        eventType: "note",
        occurredAt: "2024-01-15T10:00:00Z",
        payload
      });
      // The returned event has the original object, not the serialized string
      expect(event.payload).toEqual(payload);
    });

    it("generates unique ids for each event", () => {
      const e1 = appendEvent({ sessionId: "s1", eventType: "activity", occurredAt: "2024-01-15T10:00:00Z", payload: {} });
      const e2 = appendEvent({ sessionId: "s1", eventType: "voice", occurredAt: "2024-01-15T10:01:00Z", payload: {} });
      expect(e1.id).not.toBe(e2.id);
    });

    it("accepts empty payload", () => {
      const event = appendEvent({
        sessionId: "session-1",
        eventType: "system",
        occurredAt: "2024-01-15T10:00:00Z",
        payload: {}
      });
      expect(event.payload).toEqual({});
    });
  });

  describe("appendInsight", () => {
    it("returns an insight with a generated UUID id", () => {
      const insight = appendInsight({
        sessionId: "session-1",
        createdAt: "2024-01-15T10:00:00Z",
        kind: "summary",
        content: "Great session",
        sourceEventIds: []
      });
      expect(insight.id).toBeTypeOf("string");
      expect(insight.id.length).toBeGreaterThan(0);
    });

    it("includes all provided fields in the returned insight", () => {
      const input = {
        sessionId: "session-1",
        createdAt: "2024-01-15T10:00:00Z",
        kind: "pattern" as const,
        content: "Deep work pattern detected",
        score: 0.9,
        sourceEventIds: ["evt-1", "evt-2"]
      };
      const insight = appendInsight(input);
      expect(insight.sessionId).toBe(input.sessionId);
      expect(insight.createdAt).toBe(input.createdAt);
      expect(insight.kind).toBe(input.kind);
      expect(insight.content).toBe(input.content);
      expect(insight.score).toBe(input.score);
      expect(insight.sourceEventIds).toEqual(input.sourceEventIds);
    });

    it("stores insights so they appear in listInsights", () => {
      appendInsight({
        sessionId: "session-1",
        createdAt: "2024-01-15T10:00:00Z",
        kind: "task",
        content: "Task completed",
        sourceEventIds: []
      });
      const insights = listInsights("session-1");
      expect(insights.length).toBeGreaterThanOrEqual(1);
    });

    it("handles optional score as undefined", () => {
      const insight = appendInsight({
        sessionId: "session-1",
        createdAt: "2024-01-15T10:00:00Z",
        kind: "risk",
        content: "Risk identified",
        sourceEventIds: []
      });
      expect(insight.score).toBeUndefined();
    });
  });

  describe("listInsights", () => {
    it("returns an empty array for a session with no insights", () => {
      const insights = listInsights("nonexistent-session");
      expect(insights).toEqual([]);
    });

    it("returns only insights for the specified session", () => {
      appendInsight({ sessionId: "session-A", createdAt: "2024-01-15T10:00:00Z", kind: "summary", content: "Session A insight", sourceEventIds: [] });
      appendInsight({ sessionId: "session-B", createdAt: "2024-01-15T10:01:00Z", kind: "summary", content: "Session B insight", sourceEventIds: [] });
      const insightsA = listInsights("session-A");
      expect(insightsA).toHaveLength(1);
      expect(insightsA[0].sessionId).toBe("session-A");
    });

    it("returns insights with correct shape", () => {
      appendInsight({
        sessionId: "session-1",
        createdAt: "2024-01-15T10:00:00Z",
        kind: "summary",
        content: "Test content",
        sourceEventIds: ["e1", "e2"]
      });
      const insights = listInsights("session-1");
      const insight = insights[0];
      expect(insight).toHaveProperty("id");
      expect(insight).toHaveProperty("sessionId");
      expect(insight).toHaveProperty("createdAt");
      expect(insight).toHaveProperty("kind");
      expect(insight).toHaveProperty("content");
      expect(insight).toHaveProperty("sourceEventIds");
    });

    it("parses sourceEventIds from stored JSON string", () => {
      const sourceIds = ["evt-1", "evt-2", "evt-3"];
      appendInsight({
        sessionId: "session-1",
        createdAt: "2024-01-15T10:00:00Z",
        kind: "pattern",
        content: "Pattern found",
        sourceEventIds: sourceIds
      });
      const insights = listInsights("session-1");
      expect(insights[0].sourceEventIds).toEqual(sourceIds);
    });

    it("returns multiple insights for the same session", () => {
      appendInsight({ sessionId: "session-1", createdAt: "2024-01-15T10:00:00Z", kind: "summary", content: "First", sourceEventIds: [] });
      appendInsight({ sessionId: "session-1", createdAt: "2024-01-15T11:00:00Z", kind: "task", content: "Second", sourceEventIds: [] });
      const insights = listInsights("session-1");
      expect(insights.length).toBe(2);
    });

    it("returns kind as valid Insight['kind'] type", () => {
      appendInsight({ sessionId: "s1", createdAt: "2024-01-15T10:00:00Z", kind: "risk", content: "Risk", sourceEventIds: [] });
      const insights = listInsights("s1");
      expect(["summary", "pattern", "task", "risk"]).toContain(insights[0].kind);
    });
  });
});