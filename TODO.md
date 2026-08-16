Odin blog:
______________________________________________________

Database Models:
    User
        id,
        username,
        email,
        password hash,
        is_admin,
        created_at,
        updated_at
    Post
        id,
        slug,
        author_id (foreign key: User),
        title,
        body,
        published_at,
        created_at,
        updated_at
    Comment
        id,
        post_id (foreign key: Post),
        author_id (foreign key: User),
        body,
        created_at,
        updated_at

______________________________________________________

API checklist:

/**
 * POST /api/auth/login
 * Handle sign in.
 */

/**
 * POST /api/auth/logout
 * handle sign out.
 */

/**
 * GET /api/auth/me
 * angular helper.
 */

/**
 * GET /api/posts
 * Return posts.
 * Pagination queries (eg. ?page=1&limit=10)
 */

/**
 * GET /api/posts/:slug
 * Return a specific post.
 */

/**
 * GET /api/posts/:id/comments
 * Return all comments for specific post.
 */

/**
 * POST /api/posts
 * Create an unpublished post.
 */

/**
 * PATCH /api/posts/:id
 * publish an unpublished post.
 */

/**
 * POST /api/posts/:id/comments
 * create a comment to a post.
 */

/**
 * DELETE /api/posts/:id
 * delete a post.
 */

/**
 * DELETE /api/comments/:id
 * delete a comment.
 */
