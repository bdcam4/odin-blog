import * as jose from "jose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../app.js";
import * as postService from "../services/post.service.js";

vi.mock("../services/post.service.js", () => ({
    list: vi.fn(),
    create: vi.fn(),
    getBySlug: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
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

describe("GET /api/posts/:slug", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("allows an anonymous caller to request a post by slug", async () => {
        const result = {
            post: {
                id: 42,
                slug: "public-post",
                title: "Public post",
                body: "Post body",
                published: true,
                author: { id: 7, name: "Author" },
            },
        };
        vi.mocked(postService.getBySlug).mockResolvedValue(result as never);

        const response = await request(app).get("/api/posts/public-post");

        expect(response.status).toBe(200);
        expect(response.body).toEqual(result);
        expect(postService.getBySlug).toHaveBeenCalledWith(
            "public-post",
            undefined,
        );
    });

    it("passes the authenticated user for draft visibility checks", async () => {
        vi.mocked(postService.getBySlug).mockResolvedValue({
            post: { slug: "my-draft", published: false },
        } as never);

        const token = await new jose.SignJWT({
            email: "owner@example.com",
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
            .get("/api/posts/my-draft")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(postService.getBySlug).toHaveBeenCalledWith("my-draft", {
            id: 7,
            email: "owner@example.com",
            isAdmin: false,
        });
    });

    it("rejects a supplied invalid token even for a public post", async () => {
        const response = await request(app)
            .get("/api/posts/public-post")
            .set("Authorization", "Bearer invalid-token");

        expect(response.status).toBe(401);
        expect(postService.getBySlug).not.toHaveBeenCalled();
    });
});

describe("DELETE /api/posts/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(postService.remove).mockResolvedValue(undefined);
    });

    async function createAccessToken() {
        return new jose.SignJWT({
            email: "owner@example.com",
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

    it("requires authentication", async () => {
        const response = await request(app).delete("/api/posts/42");

        expect(response.status).toBe(401);
        expect(postService.remove).not.toHaveBeenCalled();
    });

    it("validates the ID and passes it with the authenticated user", async () => {
        const token = await createAccessToken();

        const response = await request(app)
            .delete("/api/posts/42")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(204);
        expect(response.text).toBe("");
        expect(postService.remove).toHaveBeenCalledWith(42, {
            id: 7,
            email: "owner@example.com",
            isAdmin: false,
        });
    });

    it("rejects invalid IDs before calling the service", async () => {
        const token = await createAccessToken();

        const response = await request(app)
            .delete("/api/posts/not-an-id")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(postService.remove).not.toHaveBeenCalled();
    });
});

describe("PATCH /api/posts/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    async function createAccessToken() {
        return new jose.SignJWT({
            email: "owner@example.com",
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

    it("requires authentication", async () => {
        const response = await request(app)
            .patch("/api/posts/42")
            .send({ title: "Updated title" });

        expect(response.status).toBe(401);
        expect(postService.update).not.toHaveBeenCalled();
    });

    it("updates a post and returns it with 200", async () => {
        const token = await createAccessToken();
        const post = {
            id: 42,
            slug: "my-post",
            title: "Updated title",
            body: "Post body",
        };
        vi.mocked(postService.update).mockResolvedValue(post as never);

        const response = await request(app)
            .patch("/api/posts/42")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Updated title" });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ post });
        expect(postService.update).toHaveBeenCalledWith(
            42,
            { title: "Updated title" },
            { id: 7, email: "owner@example.com", isAdmin: false },
        );
    });

    it("allows an authorized user to change the published status", async () => {
        const token = await createAccessToken();
        const post = { id: 42, slug: "my-post", published: true };
        vi.mocked(postService.update).mockResolvedValue(post as never);

        const response = await request(app)
            .patch("/api/posts/42")
            .set("Authorization", `Bearer ${token}`)
            .send({ published: true });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ post });
        expect(postService.update).toHaveBeenCalledWith(
            42,
            { published: true },
            { id: 7, email: "owner@example.com", isAdmin: false },
        );
    });

    it("rejects invalid IDs and empty update bodies before calling the service", async () => {
        const token = await createAccessToken();

        const invalidIdResponse = await request(app)
            .patch("/api/posts/not-an-id")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Updated title" });
        const emptyBodyResponse = await request(app)
            .patch("/api/posts/42")
            .set("Authorization", `Bearer ${token}`)
            .send({});
        const invalidPublishedResponse = await request(app)
            .patch("/api/posts/42")
            .set("Authorization", `Bearer ${token}`)
            .send({ published: "true" });

        expect(invalidIdResponse.status).toBe(400);
        expect(emptyBodyResponse.status).toBe(400);
        expect(invalidPublishedResponse.status).toBe(400);
        expect(postService.update).not.toHaveBeenCalled();
    });
});
