import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { UnauthorisedError } from "../errors/app-error.js";
import type { ListPostsQuery } from "../schemas/post.schema.ts";
import type { AuthUser } from "../types.js";

export async function listPosts(query: ListPostsQuery, user?: AuthUser) {

    const { page, limit, includeDrafts } = query;
    const skip = (page - 1) * limit;
    let where: Prisma.PostWhereInput = { published: true };

    if (includeDrafts) {
        if (!user) {
            throw new UnauthorisedError("Sign in to include drafts.");
        }

        where = user.isAdmin
            ? {}
            : {
                  OR: [
                      { published: true },
                      { published: false, authorId: user.id },
                  ],
              };
    }

    const rows = await prisma.post.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: limit + 1,
        select: {
            id: true,
            slug: true,
            title: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    const hasNextPage = rows.length > limit;
    const posts = rows.slice(0, limit);

    return { posts, pagination: { page, limit, hasNextPage } };
}
