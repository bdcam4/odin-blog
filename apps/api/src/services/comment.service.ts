import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import type { CreatePostCommentBody, ListPostCommentsQuery } from "../schemas/comment.schema.js";
import type { AuthUser } from "../types.js";

/** Lists comments on a published post with stable ordering and pagination metadata. */
export async function listForPost(postId: number, query: ListPostCommentsQuery) {
    const post = await prisma.post.findFirst({
        where: { id: postId, published: true },
        select: { id: true },
    });

    if (!post) {
        throw new NotFoundError("Post not found.");
    }

    const { page, limit } = query;
    const rows = await prisma.comment.findMany({
        where: { postId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit + 1,
        select: {
            id: true,
            body: true,
            createdAt: true,
            updatedAt: true,
            author: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    const hasNextPage = rows.length > limit;
    const comments = rows.slice(0, limit);

    return { comments, pagination: { page, limit, hasNextPage } };
}

/** Creates a comment only when its post exists and is published. */
export async function createForPost(postId: number, body: CreatePostCommentBody, user: AuthUser) {
    const post = await prisma.post.findFirst({
        where: { id: postId, published: true },
        select: { id: true },
    });

    if (!post) {
        throw new NotFoundError("Published post not found.");
    }

    return prisma.comment.create({
        data: {
            body: body.body,
            post: { connect: { id: postId } },
            author: { connect: { id: user.id } },
        },
        select: {
            id: true,
            body: true,
            createdAt: true,
            updatedAt: true,
            author: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
}

/** Deletes a comment owned by the caller, or any comment for an admin. */
export async function remove(id: number, user: AuthUser): Promise<void> {
    const where: Prisma.CommentWhereInput = user.isAdmin ? { id } : { id, authorId: user.id };
    const result = await prisma.comment.deleteMany({ where });

    if (result.count === 0) {
        throw new NotFoundError("Comment not found.");
    }
}
