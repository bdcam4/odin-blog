import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, UnauthorisedError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../types.js";
import { create, getBySlug, list, remove } from "./post.service.js";

vi.mock("../lib/prisma.js", () => ({
    prisma: {
        post: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            deleteMany: vi.fn(),
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
        vi.mocked(prisma.post.findFirst).mockResolvedValue({
            id: 10,
            slug: "test-post",
            title: "Test post",
            body: "Post body",
            published: true,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            author: { id: 7, name: "Owner" },
        } as never);
        vi.mocked(prisma.post.create).mockResolvedValue({
            id: 10,
            slug: "test-post",
            title: "Test post",
            published: false,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
        } as never);
        vi.mocked(prisma.post.deleteMany).mockResolvedValue({ count: 1 });
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

    it("lets anonymous callers fetch published posts by slug", async () => {
        await getBySlug("test-post");

        expect(prisma.post.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { slug: "test-post", published: true },
                select: expect.objectContaining({
                    id: true,
                    slug: true,
                    title: true,
                    body: true,
                    author: { select: { id: true, name: true } },
                }),
            }),
        );
    });

    it("lets an owner fetch their own drafts by slug", async () => {
        await getBySlug("my-draft", owner);

        expect(prisma.post.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    slug: "my-draft",
                    OR: [
                        { published: true },
                        { published: false, authorId: owner.id },
                    ],
                },
            }),
        );
    });

    it("lets admins fetch any post by slug", async () => {
        await getBySlug("someone-elses-draft", admin);

        expect(prisma.post.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { slug: "someone-elses-draft" },
            }),
        );
    });

    it("returns not found when no accessible post matches the slug", async () => {
        vi.mocked(prisma.post.findFirst).mockResolvedValue(null);

        await expect(getBySlug("private-draft")).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });

    it("deletes only the owner's post", async () => {
        await remove(42, owner);

        expect(prisma.post.deleteMany).toHaveBeenCalledWith({
            where: { id: 42, authorId: owner.id },
        });
    });

    it("allows admins to delete any post", async () => {
        await remove(42, admin);

        expect(prisma.post.deleteMany).toHaveBeenCalledWith({
            where: { id: 42 },
        });
    });

    it("returns not found when the post is missing or not owned by the user", async () => {
        vi.mocked(prisma.post.deleteMany).mockResolvedValue({ count: 0 });

        await expect(remove(42, owner)).rejects.toBeInstanceOf(NotFoundError);
    });
});
