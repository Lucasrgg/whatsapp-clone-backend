import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const connectionUrl = new URL(process.env.DATABASE_URL as string);
const adapter = new PrismaMariaDb({
  host: connectionUrl.hostname,
  port: Number(connectionUrl.port),
  user: decodeURIComponent(connectionUrl.username),
  password: decodeURIComponent(connectionUrl.password),
  database: connectionUrl.pathname.replace("/", ""),
});
const prisma = new PrismaClient({ adapter });


interface TokenPayload {
  id: number;
  email: string;
}

export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não fornecido" });
  }

  const [, token] = authHeader.split(" ");

  const tokenBanido = await prisma.tokenInvalido.findUnique({ where: { token } });
  if (tokenBanido) {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
    req.usuarioId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}