import { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

export function verifyToken(token: string): string | jwt.JwtPayload {
    return jwt.verify(token, process.env.JWT_SECRET || "secret");
}

export function getUserFromRequest(req: FastifyRequest): { id: string } | null {
    let token = req.cookies.accessToken;
    if (!token) {
        token = req.headers.authorization?.split(" ")[1];
    }
    if (!token) return null;
    try {
        const decoded = verifyToken(token);
        if (typeof decoded === 'string') return null;
        return decoded as { id: string };
    } catch (e) {
        return null;
    }
}
