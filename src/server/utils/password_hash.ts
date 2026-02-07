import { Argon2id } from "oslo/password";

const argon2id = new Argon2id();

/**
 * Hashes a password using Argon2id.
 * Oslo uses secure defaults (Memory: 64MB, Iterations: 2, Parallelism: 1).
 */
export async function hashPassword(password: string): Promise<string> {
    return await argon2id.hash(password);
}

/**
 * Verifies a password against a stored Argon2id hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
        return await argon2id.verify(hash, password);
    } catch {
        // Returns false if the hash is malformed or verification fails
        return false;
    }
}
