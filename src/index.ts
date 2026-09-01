/// <reference path="./types/express.d.ts" />
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import express from "express";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { autenticar } from "./middlewares/autenticacao";

const connectionUrl = new URL(process.env.DATABASE_URL!);

const adapter = new PrismaMariaDb({
  host: connectionUrl.hostname,
  port: Number(connectionUrl.port),
  user: decodeURIComponent(connectionUrl.username),
  password: decodeURIComponent(connectionUrl.password),
  database: connectionUrl.pathname.replace("/", ""),
});

const prisma = new PrismaClient({ adapter });

const app = express();

app.use(express.json());

const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Servidor rodando!");
});

app.get("/usuarios", autenticar, async (req, res) => {
  const usuarios = await prisma.user.findMany();
  res.json(usuarios);
});

app.post("/usuarios", autenticar, async (req, res) => {
  const { nome, email, senha } = req.body;

  const senhaCriptografada = await bcrypt.hash(senha, 10);

  const novoUsuario = await prisma.user.create({
    data: {
      nome,
      email,
      senha: senhaCriptografada,
    },
  });

  res.status(201).json(novoUsuario);
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const usuario = await prisma.user.findUnique({ where: { email } });

  if (!usuario) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos" });
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

  if (!senhaCorreta) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos" });
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    process.env.JWT_SECRET as string,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

console.log("Conectando ao banco de dados...");