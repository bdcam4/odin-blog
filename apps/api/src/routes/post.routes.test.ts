import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../app.js";
import * as postService from "../services/post.service.js";

vi.mock("../services/post.service.js", () => ({
    listPosts: vi.fn(),
}));

describe("GET /api/posts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(postService.listPosts).mockResolvedValue({
            posts: [],
            pagination: { page: 1, limit: 20, hasNextPage: false },
        });
    });

    it("allows anonymous requests for the public post list", async () => {
        const response = await request(app).get("/api/posts");

        expect(response.status).toBe(200);
        expect(postService.listPosts).toHaveBeenCalledWith(
            { page: 1, limit: 20, includeDrafts: false },
            undefined,
        );
    });

    it("passes the parsed includeDrafts flag to the service", async () => {
        const response = await request(app).get(
            "/api/posts?includeDrafts=yes",
        );

        expect(response.status).toBe(200);
        expect(postService.listPosts).toHaveBeenCalledWith(
            { page: 1, limit: 20, includeDrafts: true },
            undefined,
        );
    });
});
