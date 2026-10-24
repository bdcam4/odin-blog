import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorisedError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../types.js";
import { create, list } from "./post.service.js";

vi.mock("../lib/prisma.js", () => ({
    prisma: {
        post: {
            findMany: vi.fn(),
            create: vi.fn(),
        },
    },
}));

const defaultQuery = {
    page: 1,
    limit: 20,
    includeDrafts: false,
};

const owner: AuthUser = {
    id: 7,
    email: "owner@example.com",
    isAdmin: false,
};

const admin: AuthUser = {
    id: 1,
    email: "admin@example.com",
    isAdmin: true,
};

describe("listPosts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.post.findMany).mockResolvedValue([]);
        vi.mocked(prisma.post.create).mockResolvedValue({
            id: 10,
            slug: "test-post",
            title: "Test post",
            published: false,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
        } as never);
    });

    it("returns published posts to anonymous callers by default", async () => {
        await list(defaultQuery);

        expect(prisma.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { published: true } }),
        );
    });

    it("rejects anonymous callers who request drafts", async () => {
        await expect(
            list({ ...defaultQuery, includeDrafts: true }),
        ).rejects.toBeInstanceOf(UnauthorisedError);

        expect(prisma.post.findMany).not.toHaveBeenCalled();
    });

    it("lets an owner see published posts and their own drafts", async () => {
        await list({ ...defaultQuery, includeDrafts: true }, owner);

        expect(prisma.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [
                        { published: true },
                        { published: false, authorId: owner.id },
                    ],
                },
            }),
        );
    });

    it("lets admins see published posts and all drafts", async () => {
        await list({ ...defaultQuery, includeDrafts: true }, admin);

        expect(prisma.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: {} }),
        );
    });

    it("creates a draft with a generated unique slug and returns its summary", async () => {
        const result = await create(
            { title: "Café & Coding", body: "Post body" },
            owner,
        );

        expect(prisma.post.create).toHaveBeenCalledWith({
            data: {
                title: "Café & Coding",
                body: "Post body",
                slug: "cafe-coding",
                author: { connect: { id: owner.id } },
            },
            select: {
                id: true,
                slug: true,
                title: true,
                published: true,
                createdAt: true,
            },
        });
        expect(result).toEqual({
            id: 10,
            slug: "test-post",
            title: "Test post",
            published: false,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
        });
    });
});
