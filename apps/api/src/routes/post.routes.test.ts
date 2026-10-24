import * as jose from "jose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../app.js";
import * as postService from "../services/post.service.js";

vi.mock("../services/post.service.js", () => ({
    list: vi.fn(),
    create: vi.fn(),
}));

describe("GET /api/posts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(postService.list).mockResolvedValue({
            posts: [],
            pagination: { page: 1, limit: 20, hasNextPage: false },
        });
    });

    it("allows anonymous requests for the public post list", async () => {
        const response = await request(app).get("/api/posts");

        expect(response.status).toBe(200);
        expect(postService.list).toHaveBeenCalledWith(
            { page: 1, limit: 20, includeDrafts: false },
            undefined,
        );
    });

    it("passes the parsed includeDrafts flag to the service", async () => {
        const response = await request(app).get(
            "/api/posts?includeDrafts=yes",
        );

        expect(response.status).toBe(200);
        expect(postService.list).toHaveBeenCalledWith(
            { page: 1, limit: 20, includeDrafts: true },
            undefined,
        );
    });
});

describe("POST /api/posts", () => {
    it("returns the created post summary and its Location", async () => {
        const post = {
            id: 42,
            slug: "my-new-post",
            title: "My new post",
            published: false,
            createdAt: "2026-01-01T00:00:00.000Z",
        };
        vi.mocked(postService.create).mockResolvedValue(post as never);

        const token = await new jose.SignJWT({
            email: "author@example.com",
            isAdmin: false,
            typ: "access",
            sid: "97c0a3d1-e945-46da-b6be-f888b7e10ec2",
        })
            .setProtectedHeader({ alg: "HS256" })
            .setSubject("7")
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));

        const response = await request(app)
            .post("/api/posts")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: post.title, body: "A post body" });

        expect(response.status).toBe(201);
        expect(response.headers.location).toBe("/api/posts/my-new-post");
        expect(response.body).toEqual({ post });
        expect(postService.create).toHaveBeenCalledWith(
            { title: post.title, body: "A post body" },
            { id: 7, email: "author@example.com", isAdmin: false },
        );
    });
});
