import "dotenv/config";
import bcrypt from "bcrypt";
import express from "express";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

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

app.get("/usuarios", async (req, res) => {
  const usuarios = await prisma.user.findMany();
  res.json(usuarios);
});

app.post("/usuarios", async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});