import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorisedError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../types.js";
import { listPosts } from "./post.service.js";

vi.mock("../lib/prisma.js", () => ({
    prisma: {
        post: {
            findMany: vi.fn(),
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
    });

    it("returns published posts to anonymous callers by default", async () => {
        await listPosts(defaultQuery);

        expect(prisma.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { published: true } }),
        );
    });

    it("rejects anonymous callers who request drafts", async () => {
        await expect(
            listPosts({ ...defaultQuery, includeDrafts: true }),
        ).rejects.toBeInstanceOf(UnauthorisedError);

        expect(prisma.post.findMany).not.toHaveBeenCalled();
    });

    it("lets an owner see published posts and their own drafts", async () => {
        await listPosts({ ...defaultQuery, includeDrafts: true }, owner);

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
        await listPosts({ ...defaultQuery, includeDrafts: true }, admin);

        expect(prisma.post.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: {} }),
        );
    });
});
