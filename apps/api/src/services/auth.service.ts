import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { hash, verify } from "argon2";
import * as jose from "jose";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ConflictError, UnauthorisedError } from "../errors/app-error.js";
import type { RegisterInput, LoginInput } from "../schemas/auth.schema.js";
import type { AuthUser } from "../types.js";
import { createCsrfToken } from "../middleware/csrf.js";

const DUMMY_HASH =
    "$argon2id$v=19$m=65536,p=4,t=3$NSFHQviYJ6o0RTAtCjchGw$FHvqLNUL57ORmuxEswGdTFSCP/q70QFrZJmmZjBrWSw";

//const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

async function signAccessToken(user: AuthUser, sid: string) {
    return await new jose.SignJWT({
        email: user.email,
        isAdmin: user.isAdmin,
        typ: "access",
        sid,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(user.id))
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_TTL)
        .sign(new TextEncoder().encode(env.JWT_ACCESS_SECRET));
}

function createRefreshToken() {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    return { token, tokenHash };
}

export async function register(body: RegisterInput) {
    const email = body.email.toLowerCase();
    const passwordHash = await hash(body.password, {
        secret: Buffer.from(env.PEPPER_SECRET),
    });

    try {
        return await prisma.user.create({
            data: {
                email,
                hash: passwordHash,
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new ConflictError("Email is already registered.");
        }
        throw error;
    }
}

export async function login(body: LoginInput) {
    const email = body.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        await verify(DUMMY_HASH, body.password, {
            secret: Buffer.from(env.PEPPER_SECRET),
        });
        throw new UnauthorisedError("Invalid email or password.");
    }

    if (
        !(await verify(user.hash, body.password, {
            secret: Buffer.from(env.PEPPER_SECRET),
        }))
    ) {
        throw new UnauthorisedError("Invalid email or password.");
    }

    const sid = randomUUID();
    const refreshToken = createRefreshToken();
    const accessToken = await signAccessToken(user, sid);

    const [session] = await prisma.session.createManyAndReturn({
        data: {
            id: sid,
            userId: user.id,
            refreshTokenHash: refreshToken.tokenHash,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
            csrfToken: createCsrfToken(),
        },
    });

    return {
        user: { id: user.id, email },
        accessToken,
        refreshToken: refreshToken.token,
        refreshExpiresAt: session.expiresAt,
        csrfToken: session.csrfToken,
        tokenType: "Bearer",
        expiresIn: ACCESS_TOKEN_TTL,
    };
}

export async function logout(refreshToken?: string) {
    if (refreshToken) {
        const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
        await prisma.session.deleteMany({
            where: { refreshTokenHash },
        });
    }
}

export async function refresh(refreshToken: string) {
    const now = new Date();

    const newRefreshToken = createRefreshToken();
    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");

    const [session] = await prisma.session.updateManyAndReturn({
        where: {
            refreshTokenHash,
            expiresAt: { gt: now },
        },
        data: {
            refreshTokenHash: newRefreshToken.tokenHash,
        },
        include: { user: true },
    });

    if (!session) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    const user: AuthUser = {
        id: session.user.id,
        email: session.user.email,
        isAdmin: session.user.isAdmin,
    };
    const accessToken = await signAccessToken(user, session.id);

    return {
        user,
        accessToken,
        refreshToken: newRefreshToken.token,
        refreshExpiresAt: session.expiresAt,
        tokenType: "Bearer",
        expiresIn: ACCESS_TOKEN_TTL,
    };
}

export async function csrf(refreshToken: string) {
    const now = new Date();
    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");

    const session = await prisma.session.findUnique({
        where: {
            refreshTokenHash,
            expiresAt: { gt: now },
        },
    });

    if (!session) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    return {
        csrfToken: session.csrfToken,
    };
}

export async function getCurrentUser(id: number) {
    const user = await prisma.user.findUnique({
        where: {
            id,
        },
    });

    if (!user) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
        },
    };
}
