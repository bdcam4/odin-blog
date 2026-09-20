import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { hash, verify } from "argon2";
import * as jose from "jose";
import { ConflictError, UnauthorisedError } from "../errors/app-error.js";
import type { RegisterInput, LoginInput } from "../schemas/auth.schema.js";
import type { AuthUser } from "../types.js";

const DUMMY_HASH = "$argon2id$v=19$m=65536,p=4,t=3$NSFHQviYJ6o0RTAtCjchGw$FHvqLNUL57ORmuxEswGdTFSCP/q70QFrZJmmZjBrWSw";

const ACCESS_TOKEN_TTL = 900; // 15m in seconds

async function signAccessToken(user: { id: number; email: string; isAdmin: boolean }) {
    return await new jose.SignJWT({
        email: user.email,
        isAdmin: user.isAdmin,
        typ: "access",
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(user.id))
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_TTL)
        .sign(new TextEncoder().encode(env.JWT_ACCESS_SECRET));
}

async function signRefreshToken(user: { id: number }) {
    return await new jose.SignJWT({ typ: "refresh" })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(user.id))
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(new TextEncoder().encode(env.JWT_REFRESH_SECRET));
}

async function issueTokens(user: AuthUser){
    return {
        user: { id: user.id, email: user.email},
        accessToken: await signAccessToken(user),
        refreshToken: await signRefreshToken(user),
        tokenType: "Bearer",
        expiresIn: ACCESS_TOKEN_TTL
    }
}

export async function register(body: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
        throw new ConflictError("Email is already registered.");
    }
    const passwordHash = await hash(body.password, { secret: Buffer.from(env.PEPPER_SECRET) })
    return await prisma.user.create({
        data: {
            email: body.email,
            hash: passwordHash
        }
    });
}

export async function login(body: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user) {
        await verify(DUMMY_HASH, body.password, { secret: Buffer.from(env.PEPPER_SECRET) });
        throw new UnauthorisedError("Invalid email or password.");
    }

    if (!(await verify(user.hash, body.password, { secret: Buffer.from(env.PEPPER_SECRET) }))) {
        throw new UnauthorisedError("Invalid email or password.");
    }

    return await issueTokens(user);
}

export async function refresh(refreshToken: string) {
    let payload: jose.JWTPayload;
    try {
        ({ payload } = await jose.jwtVerify(
            refreshToken,
            new TextEncoder().encode(env.JWT_REFRESH_SECRET)
        ));
    } catch {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    if (payload.typ !== "refresh") {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!user) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    return await issueTokens(user);
}
