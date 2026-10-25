import * as jose from "jose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../app.js";
import * as commentService from "../services/comment.service.js";

vi.mock("../services/comment.service.js", () => ({
    listForPost: vi.fn(),
    createForPost: vi.fn(),
    remove: vi.fn(),
}));

async function createAccessToken() {
    return new jose.SignJWT({
        email: "reader@example.com",
        isAdmin: false,
        typ: "access",
        sid: "97c0a3d1-e945-46da-b6be-f888b7e10ec2",
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("7")
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));
}

const authenticatedUser = {
    id: 7,
    email: "reader@example.com",
    isAdmin: false,
};

describe("GET /api/posts/:postId/comments", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(commentService.listForPost).mockResolvedValue({
            comments: [],
            pagination: { page: 1, limit: 20, hasNextPage: false },
        });
    });

    it("allows anonymous callers and passes parsed pagination to the service", async () => {
        const response = await request(app).get("/api/posts/42/comments?page=2&limit=10");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            comments: [],
            pagination: { page: 1, limit: 20, hasNextPage: false },
        });
        expect(commentService.listForPost).toHaveBeenCalledWith(42, {
            page: 2,
            limit: 10,
        });
    });

    it("rejects invalid post IDs before calling the service", async () => {
        const response = await request(app).get("/api/posts/not-an-id/comments");

        expect(response.status).toBe(400);
        expect(commentService.listForPost).not.toHaveBeenCalled();
    });
});

describe("POST /api/posts/:postId/comments", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(commentService.createForPost).mockResolvedValue({
            id: 13,
            body: "A comment",
            author: { id: 7, name: "Reader" },
        } as never);
    });

    it("requires authentication", async () => {
        const response = await request(app)
            .post("/api/posts/42/comments")
            .send({ body: "A comment" });

        expect(response.status).toBe(401);
        expect(commentService.createForPost).not.toHaveBeenCalled();
    });

    it("creates a comment, returning 201 and its Location", async () => {
        const token = await createAccessToken();

        const response = await request(app)
            .post("/api/posts/42/comments")
            .set("Authorization", `Bearer ${token}`)
            .send({ body: " A comment " });

        expect(response.status).toBe(201);
        expect(response.headers.location).toBe("/api/comments/13");
        expect(response.body).toEqual({
            comment: {
                id: 13,
                body: "A comment",
                author: { id: 7, name: "Reader" },
            },
        });
        expect(commentService.createForPost).toHaveBeenCalledWith(
            42,
            { body: "A comment" },
            authenticatedUser,
        );
    });

    it("rejects an empty comment body before calling the service", async () => {
        const token = await createAccessToken();

        const response = await request(app)
            .post("/api/posts/42/comments")
            .set("Authorization", `Bearer ${token}`)
            .send({ body: "   " });

        expect(response.status).toBe(400);
        expect(commentService.createForPost).not.toHaveBeenCalled();
    });
});

describe("DELETE /api/comments/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(commentService.remove).mockResolvedValue(undefined);
    });

    it("requires authentication", async () => {
        const response = await request(app).delete("/api/comments/13");

        expect(response.status).toBe(401);
        expect(commentService.remove).not.toHaveBeenCalled();
    });

    it("deletes the comment and returns 204", async () => {
        const token = await createAccessToken();

        const response = await request(app)
            .delete("/api/comments/13")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(204);
        expect(response.text).toBe("");
        expect(commentService.remove).toHaveBeenCalledWith(13, authenticatedUser);
    });

    it("rejects invalid comment IDs before calling the service", async () => {
        const token = await createAccessToken();

        const response = await request(app)
            .delete("/api/comments/not-an-id")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(commentService.remove).not.toHaveBeenCalled();
    });
});
