// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  adminGetUserById: vi.fn(),
  adminCreateUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url, key) =>
    key === "service-key"
      ? {
          auth: {
            admin: {
              createUser: supabaseMocks.adminCreateUser,
              getUserById: supabaseMocks.adminGetUserById,
            },
          },
          from: () => ({
            select: () => ({
              eq: () => ({ maybeSingle: supabaseMocks.profileMaybeSingle }),
            }),
          }),
        }
      : { auth: { signInWithPassword: supabaseMocks.signInWithPassword } },
}));

import handler from "./username-login";

function createResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe("username login API", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    supabaseMocks.profileMaybeSingle.mockReset();
    supabaseMocks.adminGetUserById.mockReset();
    supabaseMocks.signInWithPassword.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a session only after the username's password is authenticated", async () => {
    const session = { access_token: "access", refresh_token: "refresh" };
    supabaseMocks.profileMaybeSingle.mockResolvedValue({
      data: { id: "user-1" },
      error: null,
    });
    supabaseMocks.adminGetUserById.mockResolvedValue({
      data: { user: { email: "rehan@example.com" } },
      error: null,
    });
    supabaseMocks.signInWithPassword.mockResolvedValue({
      data: { session },
      error: null,
    });
    const response = createResponse();

    await handler(
      { method: "POST", body: { username: "Rehan", password: "password123" } },
      response,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ session });
    expect(supabaseMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "rehan@example.com",
      password: "password123",
    });
  });

  it("returns the same generic credentials error for an unknown username", async () => {
    supabaseMocks.profileMaybeSingle.mockResolvedValue({ data: null, error: null });
    const response = createResponse();

    await handler(
      { method: "POST", body: { username: "unknown", password: "password123" } },
      response,
    );

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Invalid username or password." });
    expect(supabaseMocks.adminGetUserById).not.toHaveBeenCalled();
    expect(supabaseMocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("does not reveal whether a known username has the wrong password", async () => {
    supabaseMocks.profileMaybeSingle.mockResolvedValue({
      data: { id: "user-1" },
      error: null,
    });
    supabaseMocks.adminGetUserById.mockResolvedValue({
      data: { user: { email: "rehan@example.com" } },
      error: null,
    });
    supabaseMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error("Invalid login credentials"),
    });
    const response = createResponse();

    await handler(
      { method: "POST", body: { username: "rehan", password: "wrong-password" } },
      response,
    );

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Invalid username or password." });
  });
});
