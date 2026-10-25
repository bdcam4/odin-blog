import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { ConflictError, NotFoundError, UnauthorisedError } from "../errors/app-error.js";
import type { CreatePostBody, ListPostsQuery, UpdatePostBody } from "../schemas/post.schema.ts";
import type { AuthUser } from "../types.js";

/**
 * Lists posts with pagination metadata. Anonymous callers see published posts;
 * owners and admins may include drafts.
 */
export async function list(query: ListPostsQuery, user?: AuthUser) {
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
                  OR: [{ published: true }, { published: false, authorId: user.id }],
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

/**
 * Finds a post by slug. Drafts are visible only to their owner or an admin;
 * published posts are public.
 */
export async function getBySlug(slug: string, user?: AuthUser) {
    const where: Prisma.PostWhereInput = {
        slug,
        ...(user?.isAdmin
            ? {}
            : user
              ? {
                    OR: [{ published: true }, { published: false, authorId: user.id }],
                }
              : { published: true }),
    };

    const post = await prisma.post.findFirst({
        where,
        select: {
            id: true,
            slug: true,
            title: true,
            body: true,
            published: true,
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

    if (!post) {
        throw new NotFoundError("Post not found.");
    }

    return { post };
}

/** Creates a post for its author, retrying with numeric slug suffixes when needed. */
export async function create(body: CreatePostBody, user: AuthUser) {
    const baseSlug = slugify(body.title);

    // Retry with a numeric suffix if a slug already exists, or another create
    // request wins the same slug between our insert and the database check.
    for (let suffix = 1; suffix <= 100; suffix += 1) {
        const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;

        try {
            return await prisma.post.create({
                data: {
                    title: body.title,
                    body: body.body,
                    slug,
                    author: {
                        connect: { id: user.id },
                    },
                },
                select: {
                    id: true,
                    slug: true,
                    title: true,
                    published: true,
                    createdAt: true,
                },
            });
        } catch (error) {
            if (
                !(error instanceof Prisma.PrismaClientKnownRequestError) ||
                error.code !== "P2002"
            ) {
                throw error;
            }
        }
    }
    throw new ConflictError("Could not generate a unique post slug.");
}

/** Updates only supplied fields; authors may update their own posts and admins any post. */
export async function update(id: number, body: UpdatePostBody, user: AuthUser) {
    const where = user.isAdmin ? { id } : { id, authorId: user.id };

    try {
        return await prisma.post.update({
            where,
            data: body,
            select: {
                id: true,
                slug: true,
                title: true,
                body: true,
                published: true,
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
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            throw new NotFoundError("Post not found.");
        }
        throw error;
    }
}

/** Deletes the author's post or any post for an admin; inaccessible posts appear not found. */
export async function remove(id: number, user: AuthUser): Promise<void> {
    const where = user.isAdmin ? { id } : { id, authorId: user.id };

    const result = await prisma.post.deleteMany({ where });

    if (result.count === 0) {
        throw new NotFoundError("Post not found.");
    }
}

/** Normalizes a title into a lowercase ASCII slug, using `post` when no characters remain. */
function slugify(title: string) {
    const slug = title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return slug || "post";
}
