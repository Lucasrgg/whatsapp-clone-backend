/// <reference path="./types/express.d.ts" />
import { createServer } from "http";
import { Server } from "socket.io";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import express from "express";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { autenticar } from "./middlewares/autenticacao";
import multer from "multer";
import path from "path";

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

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const nomeUnico = `${Date.now()}-${file.originalname}`;
    cb(null, nomeUnico);
  },
});

const upload = multer({ storage });

app.post("/usuarios/foto", autenticar, upload.single("foto"), async (req, res) => {
  const meuId = req.usuarioId as number;
  const caminhoArquivo = req.file?.filename;

  const usuarioAtualizado = await prisma.user.update({
    where: { id: meuId },
    data: { fotoPerfil: caminhoArquivo },
  });

  res.json(usuarioAtualizado);
});

app.use(express.json());

app.use("/uploads", express.static("uploads"));

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

io.on("connection", (socket) => {
  console.log("Usuário conectado:", socket.id);

  socket.on("entrarConversa", (conversaId) => {
    socket.join(`conversa_${conversaId}`);
    console.log(`Socket ${socket.id} entrou na conversa ${conversaId}`);
  });

  socket.on("enviarMensagem", async (dadosBrutos) => {
  const dados = typeof dadosBrutos === "string" ? JSON.parse(dadosBrutos) : dadosBrutos;
  const { conversaId, conteudo, remetenteId } = dados;

  const novaMensagem = await prisma.mensagem.create({
    data: { conteudo, conversaId, remetenteId },
    include: { remetente: true },
  });

  io.to(`conversa_${conversaId}`).emit("novaMensagem", novaMensagem);
});

  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

app.post("/conversas", autenticar, async (req, res) => {
  const { participanteId } = req.body;
  const meuId = req.usuarioId as number;

  const novaConversa = await prisma.conversa.create({
    data: {
      participantes: {
        connect: [{ id: meuId }, { id: participanteId }],
      },
    },
    include: { participantes: true },
  });

  res.status(201).json(novaConversa);
});

app.get("/conversas", autenticar, async (req, res) => {
  const meuId = req.usuarioId as number;

  const conversas = await prisma.conversa.findMany({
    where: {
      participantes: { some: { id: meuId } },
    },
    include: { participantes: true },
  });

  res.json(conversas);
});

app.post("/mensagens", autenticar, async (req, res) => {
  const { conversaId, conteudo } = req.body;
  const meuId = req.usuarioId as number;

  const novaMensagem = await prisma.mensagem.create({
    data: {
      conteudo,
      conversaId,
      remetenteId: meuId,
    },
  });

  res.status(201).json(novaMensagem);
});

app.get("/conversas/:id/mensagens", autenticar, async (req, res) => {
  const conversaId = Number(req.params.id);

  const mensagens = await prisma.mensagem.findMany({
    where: { conversaId },
    orderBy: { enviadaEm: "asc" },
    include: { remetente: true },
  });

  res.json(mensagens);
});