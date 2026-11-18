// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  adminCreateUser: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url, key) =>
    key === "service-key"
      ? { auth: { admin: { createUser: supabaseMocks.adminCreateUser } } }
      : { auth: { signInWithPassword: supabaseMocks.signInWithPassword } },
}));

import handler from "./sign-up";

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

describe("email sign-up API", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    supabaseMocks.adminCreateUser.mockReset().mockResolvedValue({ error: null });
    supabaseMocks.signInWithPassword.mockReset().mockResolvedValue({
      data: {
        session: { access_token: "access", refresh_token: "refresh" },
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a confirmed account and immediately returns its signed-in session", async () => {
    const response = createResponse();

    await handler(
      { method: "POST", body: { email: "rehan@example.com", password: "password123" } },
      response,
    );

    expect(supabaseMocks.adminCreateUser).toHaveBeenCalledWith({
      email: "rehan@example.com",
      password: "password123",
      email_confirm: true,
    });
    expect(supabaseMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "rehan@example.com",
      password: "password123",
    });
    expect(response.statusCode).toBe(201);
    expect(response.body.session.access_token).toBe("access");
  });

  it("explains when an account already exists for the email", async () => {
    supabaseMocks.adminCreateUser.mockResolvedValue({
      error: { code: "email_exists", status: 422 },
    });
    const response = createResponse();

    await handler(
      { method: "POST", body: { email: "rehan@example.com", password: "password123" } },
      response,
    );

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toContain("already exists");
    expect(supabaseMocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("logs safe diagnostics for unexpected Supabase errors", async () => {
    supabaseMocks.adminCreateUser.mockResolvedValue({
      error: { code: "bad_jwt", status: 401 },
    });
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = createResponse();

    await handler(
      { method: "POST", body: { email: "rehan@example.com", password: "password123" } },
      response,
    );

    expect(response.statusCode).toBe(500);
    expect(logError).toHaveBeenCalledWith("Supabase account creation failed:", {
      code: "bad_jwt",
      status: 401,
    });
  });
});
