/**
 * AuthService
 *
 * Minimal JWT-based authentication service.
 * TODO: Strengthen for production:
 * - Add refresh tokens
 * - Implement password hashing with bcrypt/argon2
 * - Add rate limiting
 * - Add email verification
 * - Add OAuth providers
 */
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/server/db/schema";
import { users } from "@/server/db/schema";
import type { JWTPayload, User } from "@/server/types";
import { hashPassword, verifyPassword } from "../utils/password_hash";

type DrizzleDB = PostgresJsDatabase<typeof schema>;

export class AuthService {
    constructor(
        private db: DrizzleDB,
        private jwtSecret: string,
        private jwtExpiresIn: string = "7d",
    ) { }

    /**
     * Register a new user.
     * TODO: Add email verification
     */
    async register(params: {
        email: string;
        password: string;
    }): Promise<{ user: User; token: string }> {
        // Check if user already exists
        const existing = await this.db.query.users.findFirst({
            where: eq(users.email, params.email),
        });

        if (existing) {
            throw new Error("User already exists");
        }

        // TODO: Use proper password hashing
        const passwordHash = await hashPassword(params.password);

        // Create user
        const [user] = await this.db
            .insert(users)
            .values({
                email: params.email,
                passwordHash,
            })
            .returning({
                id: users.id,
                email: users.email,
                createdAt: users.createdAt,
            });

        if (!user) {
            throw new Error("Failed to create user");
        }

        // Generate JWT
        const token = this.generateToken(user);

        return { user, token };
    }

    /**
     * Login a user.
     */
    async login(params: {
        email: string;
        password: string;
    }): Promise<{ user: User; token: string }> {
        // Find user
        const user = await this.db.query.users.findFirst({
            where: eq(users.email, params.email),
        });

        if (!user) {
            throw new Error("Invalid credentials");
        }

        // Verify password
        // TODO: Use proper password verification
        if (!await verifyPassword(params.password, user.passwordHash)) {
            throw new Error("Invalid credentials");
        }

        // Generate JWT
        const token = this.generateToken({
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.createdAt,
            },
            token,
        };
    }

    /**
     * Verify a JWT token and return the payload.
     */
    verifyToken(token: string): JWTPayload {
        try {
            const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
            return payload;
        } catch {
            throw new Error("Invalid token");
        }
    }

    /**
     * Get user by ID.
     */
    async getUserById(id: string): Promise<User | null> {
        const user = await this.db.query.users.findFirst({
            where: eq(users.id, id),
            columns: {
                id: true,
                email: true,
                createdAt: true,
            },
        });

        return user ?? null;
    }

    /**
     * Generate a JWT token for a user.
     */
    private generateToken(user: User): string {
        const payload: Omit<JWTPayload, "iat" | "exp"> = {
            userId: user.id,
            email: user.email,
        };

        // Cast expiresIn to satisfy the StringValue type from jsonwebtoken
        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn as `${number}d`,
        });
    }
}
