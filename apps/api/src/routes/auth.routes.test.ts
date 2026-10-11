import * as jose from "jose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../app.js";
import { ConflictError, UnauthorisedError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import * as authService from "../services/auth.service.js";

vi.mock("../services/auth.service.js", () => ({
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    csrf: vi.fn(),
    getCurrentUser: vi.fn(),
}));

vi.mock("../lib/prisma.js", () => ({
    prisma: {
        session: {
            findUnique: vi.fn(),
        },
    },
}));

const allowedOrigin = "http://localhost:4200";
const credentials = {
    email: "Reader@example.com",
    password: "long-enough-password",
};
const refreshToken = "fake-refresh-token";
const csrfToken = "fake-csrf-token";

function withAuthOrigin(method: "get" | "post", path: string) {
    return request(app)[method](path).set("Origin", allowedOrigin);
}

function mockActiveSession() {
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
        csrfToken,
    } as never);
}

describe("auth routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("POST /api/auth/register", () => {
        it("creates an account and returns only public user fields", async () => {
            vi.mocked(authService.register).mockResolvedValue({
                id: 42,
                email: "reader@example.com",
            } as never);

            const response = await request(app)
                .post("/api/auth/register")
                .send(credentials);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                user: { id: 42, email: "reader@example.com" },
            });
            expect(authService.register).toHaveBeenCalledWith(credentials);
        });

        it("rejects invalid credentials before calling the service", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({ email: "not-an-email", password: "short" });

            expect(response.status).toBe(400);
            expect(response.body.type).toContain("validation-error");
            expect(authService.register).not.toHaveBeenCalled();
        });

        it("returns conflict when the service reports a duplicate email", async () => {
            vi.mocked(authService.register).mockRejectedValue(
                new ConflictError("Email is already registered."),
            );

            const response = await request(app)
                .post("/api/auth/register")
                .send(credentials);

            expect(response.status).toBe(409);
            expect(response.body.code).toBe("CONFLICT");
        });
    });

    describe("POST /api/auth/login", () => {
        it("returns access details and sets the refresh token as an HTTP-only cookie", async () => {
            vi.mocked(authService.login).mockResolvedValue({
                user: { id: 42, email: "reader@example.com" },
                accessToken: "access-token",
                refreshToken,
                refreshExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
                csrfToken,
                tokenType: "Bearer",
                expiresIn: "15m",
            } as never);

            const response = await withAuthOrigin("post", "/api/auth/login")
                .send(credentials);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                user: { id: 42, email: "reader@example.com" },
                accessToken: "access-token",
                refreshExpiresAt: "2030-01-01T00:00:00.000Z",
                csrfToken,
                tokenType: "Bearer",
                expiresIn: "15m",
            });
            expect(response.body).not.toHaveProperty("refreshToken");
            expect(response.headers["set-cookie"]).toEqual(
                expect.arrayContaining([
                    expect.stringContaining(`__Secure-refresh=${refreshToken}`),
                    expect.stringContaining("HttpOnly"),
                    expect.stringContaining("Secure"),
                    expect.stringContaining("SameSite=None"),
                ]),
            );
            expect(authService.login).toHaveBeenCalledWith(credentials);
        });

        it("rejects a disallowed origin before calling the service", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .set("Origin", "https://untrusted.example")
                .send(credentials);

            expect(response.status).toBe(403);
            expect(authService.login).not.toHaveBeenCalled();
        });

        it("rejects invalid credentials input before calling the service", async () => {
            const response = await withAuthOrigin("post", "/api/auth/login")
                .send({ email: "bad-email", password: "short" });

            expect(response.status).toBe(400);
            expect(authService.login).not.toHaveBeenCalled();
        });

        it("returns unauthorised when the service rejects the credentials", async () => {
            vi.mocked(authService.login).mockRejectedValue(
                new UnauthorisedError("Invalid email or password."),
            );

            const response = await withAuthOrigin("post", "/api/auth/login")
                .send(credentials);

            expect(response.status).toBe(401);
            expect(response.headers["set-cookie"]).toBeUndefined();
        });
    });

    describe("POST /api/auth/logout", () => {
        it("allows logout without a session and clears the refresh cookie", async () => {
            const response = await withAuthOrigin("post", "/api/auth/logout");

            expect(response.status).toBe(204);
            expect(authService.logout).toHaveBeenCalledWith(undefined);
            expect(response.headers["set-cookie"]).toEqual(
                expect.arrayContaining([
                    expect.stringContaining("__Secure-refresh="),
                    expect.stringContaining("Expires=Thu, 01 Jan 1970"),
                ]),
            );
            expect(prisma.session.findUnique).not.toHaveBeenCalled();
        });

        it("requires the matching CSRF token when a session exists", async () => {
            mockActiveSession();

            const response = await withAuthOrigin("post", "/api/auth/logout")
                .set("Cookie", `__Secure-refresh=${refreshToken}`);

            expect(response.status).toBe(403);
            expect(authService.logout).not.toHaveBeenCalled();
        });

        it("logs out a session when its CSRF token is valid", async () => {
            mockActiveSession();

            const response = await withAuthOrigin("post", "/api/auth/logout")
                .set("Cookie", `__Secure-refresh=${refreshToken}`)
                .set("X-CSRF-Token", csrfToken);

            expect(response.status).toBe(204);
            expect(authService.logout).toHaveBeenCalledWith(refreshToken);
        });
    });

    describe("POST /api/auth/refresh", () => {
        it("requires a refresh cookie", async () => {
            const response = await withAuthOrigin("post", "/api/auth/refresh");

            expect(response.status).toBe(401);
            expect(authService.refresh).not.toHaveBeenCalled();
        });

        it("rejects a disallowed origin", async () => {
            const response = await request(app)
                .post("/api/auth/refresh")
                .set("Origin", "https://untrusted.example")
                .set("Cookie", `__Secure-refresh=${refreshToken}`)
                .set("X-CSRF-Token", csrfToken);

            expect(response.status).toBe(403);
            expect(authService.refresh).not.toHaveBeenCalled();
        });

        it("requires a valid CSRF token for the refresh cookie", async () => {
            mockActiveSession();

            const response = await withAuthOrigin("post", "/api/auth/refresh")
                .set("Cookie", `__Secure-refresh=${refreshToken}`);

            expect(response.status).toBe(403);
            expect(authService.refresh).not.toHaveBeenCalled();
        });

        it("returns refreshed access details and sets the replacement cookie", async () => {
            mockActiveSession();
            vi.mocked(authService.refresh).mockResolvedValue({
                user: { id: 42, email: "reader@example.com", isAdmin: false },
                accessToken: "new-access-token",
                refreshToken: "new-refresh-token",
                refreshExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
                tokenType: "Bearer",
                expiresIn: "15m",
            } as never);

            const response = await withAuthOrigin("post", "/api/auth/refresh")
                .set("Cookie", `__Secure-refresh=${refreshToken}`)
                .set("X-CSRF-Token", csrfToken);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                user: { id: 42, email: "reader@example.com", isAdmin: false },
                accessToken: "new-access-token",
                refreshExpiresAt: "2030-01-01T00:00:00.000Z",
                tokenType: "Bearer",
                expiresIn: "15m",
            });
            expect(response.body).not.toHaveProperty("refreshToken");
            expect(response.headers["set-cookie"]).toEqual(
                expect.arrayContaining([
                    expect.stringContaining("__Secure-refresh=new-refresh-token"),
                ]),
            );
            expect(authService.refresh).toHaveBeenCalledWith(refreshToken);
        });
    });

    describe("GET /api/auth/csrf", () => {
        it("returns the session CSRF token without allowing caches to store it", async () => {
            vi.mocked(authService.csrf).mockResolvedValue({ csrfToken } as never);

            const response = await withAuthOrigin("get", "/api/auth/csrf")
                .set("Cookie", `__Secure-refresh=${refreshToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ csrfToken });
            expect(response.headers["cache-control"]).toBe("no-store");
            expect(authService.csrf).toHaveBeenCalledWith(refreshToken);
        });

        it("requires a refresh cookie", async () => {
            const response = await withAuthOrigin("get", "/api/auth/csrf");

            expect(response.status).toBe(401);
            expect(authService.csrf).not.toHaveBeenCalled();
        });
    });

    describe("GET /api/auth/me", () => {
        it("rejects requests without a bearer token", async () => {
            const response = await request(app).get("/api/auth/me");

            expect(response.status).toBe(401);
            expect(authService.getCurrentUser).not.toHaveBeenCalled();
        });

        it("returns the authenticated user's profile", async () => {
            const token = await new jose.SignJWT({
                email: "reader@example.com",
                isAdmin: false,
                typ: "access",
                sid: "97c0a3d1-e945-46da-b6be-f888b7e10ec2",
            })
                .setProtectedHeader({ alg: "HS256" })
                .setSubject("42")
                .setIssuedAt()
                .setExpirationTime("5m")
                .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));

            vi.mocked(authService.getCurrentUser).mockResolvedValue({
                user: {
                    id: 42,
                    email: "reader@example.com",
                    name: "Reader",
                    isAdmin: false,
                },
            } as never);

            const response = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.user).toEqual({
                id: 42,
                email: "reader@example.com",
                name: "Reader",
                isAdmin: false,
            });
            expect(authService.getCurrentUser).toHaveBeenCalledWith(42);
        });
    });
});
