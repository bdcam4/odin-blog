______________________________________________________

Odin blog:
______________________________________________________
File structure plan:

apps/api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.ts                 # Express app configuration; no listen()
│   ├── server.ts              # Environment loading and app.listen()
│   │
│   ├── config/
│   │   ├── env.ts             # Zod-validated env (secrets, TTLs, pepper); fails fast at boot
│   │   └── cors.ts
│   │
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── password.ts        # argon2id hash/verify helpers (peppered)
│   │   └── tokens.ts          # jose sign/verify (access + refresh), refresh-token hashing
│   │
│   ├── routes/
│   │   ├── index.ts           # Mounts /health, /auth, /posts, /comments
│   │   ├── health.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── post.routes.ts
│   │   └── comment.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── post.controller.ts
│   │   └── comment.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── post.service.ts
│   │   └── comment.service.ts
│   │
│   ├── schemas/
│   │   ├── auth.schema.ts
│   │   ├── post.schema.ts
│   │   ├── comment.schema.ts
│   │   └── pagination.schema.ts
│   │
│   ├── middleware/
│   │   ├── require-auth.ts     # Verifies Bearer access token (jose), attaches req.user
│   │   ├── require-admin.ts    # Checks isAdmin claim (403 otherwise)
│   │   ├── rate-limit.ts       # global / auth / refresh limiters
│   │   ├── validate-request.ts
│   │   ├── error-handler.ts
│   │   └── not-found.ts
│   │
│   ├── errors/
│   │   ├── app-error.ts
│   │   └── error-codes.ts
│   │
│   ├── types/
│   │   └── express.d.ts
│   │
│   └── test/
│       ├── setup.ts
│       ├── helpers/
│       ├── auth/
│       ├── posts/
│       └── comments/
└── package.json

______________________________________________________
Route design:
    GET    /health
    
    POST   /api/auth/register
    POST   /api/auth/login
    POST   /api/auth/refresh
    POST   /api/auth/logout
    GET    /api/auth/me
    
    GET    /api/posts
    POST   /api/posts
    GET    /api/posts/:slug
    PATCH  /api/posts/:id
    DELETE /api/posts/:id
    
    GET    /api/posts/:postId/comments
    POST   /api/posts/:postId/comments
    
    DELETE /api/comments/:id

______________________________________________________
Auth plan (decisions locked in — libraries chosen over express-session/bcrypt):

    Libraries:
        jose                # JWT sign/verify (HS256) — modern standard, zero-dep
        argon2              # argon2id password hashing — ships own TS types
        express-rate-limit  # v7+; `max` renamed to `limit`

    Password hashing (lib/password.ts):
        - argon2id, peppered: pass env.PEPPER_SECRET via argon2's `secret`
          option in BOTH hash() and verify(); if rotation is ever needed,
          use versioned peppers (PEPPER_V1, PEPPER_V2, ...)
        - salt + cost params are embedded in the hash string itself, so no
          extra DB column — store the full string in User.password
        - unlike bcrypt, no silent 72-byte truncation

    Token strategy (lib/tokens.ts):
        - Access token: JWT, HS256, JWT_ACCESS_SECRET, ~15 min lifetime,
          claims: sub, isAdmin. Returned in the response body; clients send
          `Authorization: Bearer <token>` (Angular admin keeps it in memory).
        - Refresh token: JWT, separate JWT_REFRESH_SECRET, ~7 days, random
          jti. Sent as httpOnly; Secure; SameSite=Strict cookie.
        - Prisma RefreshToken model: tokenHash (sha256 of token, unique),
          userId, expiresAt, revokedAt, createdAt. Never store raw tokens.
          Refresh rotates (revoke old row, issue new pair); logout revokes.
        - New env vars: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, PEPPER_SECRET
          (generate with `openssl rand -base64 32`; zod .min(32) in env.ts)

    Rate limiting (middleware/rate-limit.ts):
        - globalLimiter   ~300/15min per IP, mounted on /api
        - login/register  ~5/15min per IP (brute-force protection)
        - refresh         looser limit (routine traffic, cookie-based)
        - scope per route+method inside auth.routes.ts, not app.use paths
        - 429 body standardized to problem+json via the `handler` option
          (the limiter responds directly; never reaches errorHandler, so
          no AppError class needed)
        - Deploy (Koyeb / Oracle VM with own nginx): app.set("trust proxy", 1).
          Too low -> all traffic shares the proxy IP, one shared bucket
          locks everyone out; too high -> client-supplied X-Forwarded-For
          is trusted and the limiter can be bypassed with fake IPs.
        - Default MemoryStore is fine for single instance; swap in
          rate-limit-redis only if running multiple instances.

    Error classes (errors/app-error.ts):
        - UnauthorizedError  401  bad credentials, missing/expired token
        - ForbiddenError     403  authenticated but not admin
        - (404/409 exist; 500 stays the generic fallback in error-handler;
          429 comes from the limiter itself)

    Types: augment Express Request with the authenticated user in
    types/express.d.ts.

______________________________________________________
Implementation order:
    1. Move startup logic into server.ts and make app.ts testable.
    2. Add config/env.ts and lib/prisma.ts.
    3. Add shared errors, error middleware, and request validation.
    4. Add auth: env secrets, argon2 password lib, jose token lib,
       RefreshToken model + migration, register/login/refresh/logout/me,
       require-auth / require-admin middleware, rate limiters.
    5. Add post schemas, routes, controllers, and services.
    6. Add comments.
    7. Add integration tests grouped by resource.
    8. Add pagination and authorization edge-case tests.

______________________________________________________
