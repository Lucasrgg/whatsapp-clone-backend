/// <reference path="./types/express.d.ts" />
import { createServer } from "http";
import { Server } from "socket.io";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import express from "express";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { autenticar, validarToken } from "./middlewares/autenticacao";
import multer from "multer";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";



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
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Autenticação do Socket.IO: só aceita conexões com um JWT válido
// (o cliente envia o token em auth: { token } ao conectar)
io.use(async (socket, next) => {
  const payload = await validarToken(socket.handshake.auth?.token);

  if (!payload) {
    return next(new Error("Token inválido ou ausente"));
  }

  socket.data.usuarioId = payload.id;
  next();
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

/**
 * @swagger
 * /usuarios/foto:
 *   post:
 *     summary: Envia a foto de perfil do usuário logado
 *     tags: [Usuários]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               foto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: Foto atualizada }
 *       401: { description: Token ausente ou inválido }
 */
app.post("/usuarios/foto", autenticar, upload.single("foto"), async (req, res) => {
  const meuId = req.usuarioId as number;
  const caminhoArquivo = req.file?.filename;

if (!req.file) {
  return res.status(400).json({ erro: "Envie uma imagem no campo 'foto'" });
}

  const usuarioAtualizado = await prisma.user.update({
  where: { id: meuId },
  data: { fotoPerfil: caminhoArquivo },
  select: { id: true, nome: true, email: true, fotoPerfil: true },
});

  res.json(usuarioAtualizado);
});

app.use(express.json());

app.use("/uploads", express.static("uploads"));

const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Servidor rodando!");
});

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Lista os usuários (requer autenticação)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 *       401:
 *         description: Token ausente ou inválido
 */

app.get("/usuarios", autenticar, async (req, res) => {
  const usuarios = await prisma.user.findMany({
    select: { id: true, nome: true, email: true, fotoPerfil: true },
  });
  res.json(usuarios);
});

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome: { type: string }
 *               email: { type: string }
 *               senha: { type: string }
 *     responses:
 *       201:
 *         description: Usuário criado
 */

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

  res.status(201).json({
    id: novoUsuario.id,
    nome: novoUsuario.nome,
    email: novoUsuario.email,
  });
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Faz login e retorna o token JWT
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               senha: { type: string }
 *     responses:
 *       200:
 *         description: Login realizado, retorna o token
 *       401:
 *         description: Credenciais inválidas
 */

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Encerra a sessão e invalida o token
 *     tags: [Autenticação]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logout realizado }
 */
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
  const usuarioId = socket.data.usuarioId as number;
  console.log("Usuário conectado:", socket.id, "(id", usuarioId + ")");

  socket.on("entrarConversa", async (conversaId) => {
    try {
      // Só deixa entrar na sala quem participa da conversa
      const participa = await prisma.conversa.findFirst({
        where: {
          id: Number(conversaId),
          participantes: { some: { id: usuarioId } },
        },
        select: { id: true },
      });

      if (!participa) {
        socket.emit("erro", { erro: "Você não participa desta conversa" });
        return;
      }

      socket.join(`conversa_${conversaId}`);
      console.log(`Socket ${socket.id} entrou na conversa ${conversaId}`);
    } catch (err) {
      socket.emit("erro", { erro: "Não foi possível entrar na conversa" });
    }
  });

  socket.on("enviarMensagem", async (dadosBrutos) => {
    try {
      const dados = typeof dadosBrutos === "string" ? JSON.parse(dadosBrutos) : dadosBrutos;
      const { conversaId, conteudo } = dados;

      // Só quem participa da conversa pode enviar mensagem nela
      const participa = await prisma.conversa.findFirst({
        where: {
          id: Number(conversaId),
          participantes: { some: { id: usuarioId } },
        },
        select: { id: true },
      });

      if (!participa) {
        socket.emit("erro", { erro: "Você não participa desta conversa" });
        return;
      }

      // O remetente vem do token (socket.data), nunca do cliente
      const novaMensagem = await prisma.mensagem.create({
        data: { conteudo, conversaId: Number(conversaId), remetenteId: usuarioId },
        include: { remetente: { select: { id: true, nome: true, email: true, fotoPerfil: true } } },
      });

      io.to(`conversa_${conversaId}`).emit("novaMensagem", novaMensagem);
    } catch (err) {
      socket.emit("erro", { erro: "Não foi possível enviar a mensagem" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

/**
 * @swagger
 * /conversas:
 *   post:
 *     summary: Cria uma conversa com outro usuário
 *     tags: [Conversas]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participanteId: { type: integer }
 *     responses:
 *       201: { description: Conversa criada }
 *       401: { description: Token ausente ou inválido }
 */
app.post("/conversas", autenticar, async (req, res) => {
  const { participanteId } = req.body;
  const meuId = req.usuarioId as number;

  const novaConversa = await prisma.conversa.create({
    data: {
      participantes: {
        connect: [{ id: meuId }, { id: participanteId }],
      },
    },
    include: { participantes: { select: { id: true, nome: true, email: true, fotoPerfil: true } } },
  });

  res.status(201).json(novaConversa);
});

/**
 * @swagger
 * /conversas:
 *   get:
 *     summary: Lista as conversas do usuário logado
 *     tags: [Conversas]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de conversas }
 *       401: { description: Token ausente ou inválido }
 */
app.get("/conversas", autenticar, async (req, res) => {
  const meuId = req.usuarioId as number;

  const conversas = await prisma.conversa.findMany({
    where: {
      participantes: { some: { id: meuId } },
    },
    include: { participantes: { select: { id: true, nome: true, email: true, fotoPerfil: true } } },
  });

  res.json(conversas);
});

/**
 * @swagger
 * /mensagens:
 *   post:
 *     summary: Envia uma mensagem em uma conversa
 *     tags: [Mensagens]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversaId: { type: integer }
 *               conteudo: { type: string }
 *     responses:
 *       201: { description: Mensagem enviada }
 *       401: { description: Token ausente ou inválido }
 */
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

/**
 * @swagger
 * /conversas/{id}/mensagens:
 *   get:
 *     summary: Lista as mensagens de uma conversa
 *     tags: [Mensagens]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Lista de mensagens }
 *       401: { description: Token ausente ou inválido }
 */
app.get("/conversas/:id/mensagens", autenticar, async (req, res) => {
  const conversaId = Number(req.params.id);

  const mensagens = await prisma.mensagem.findMany({
    where: { conversaId },
    orderBy: { enviadaEm: "asc" },
    include: {
      remetente: { select: { id: true, nome: true, email: true, fotoPerfil: true } },
    },
  });

  res.json(mensagens);
});

app.post("/logout", autenticar, async (req, res) => {
  const authHeader = req.headers.authorization as string;
  const [, token] = authHeader.split(" ");

  await prisma.tokenInvalido.create({ data: { token } });

  res.json({ mensagem: "Logout realizado com sucesso" });
});

/**
 * @swagger
 * /usuarios/buscar:
 *   get:
 *     summary: Busca usuários pelo nome
 *     tags: [Usuários]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: nome, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Usuários encontrados }
 */
app.get("/usuarios/buscar", autenticar, async (req, res) => {
  const { nome } = req.query;

  const usuarios = await prisma.user.findMany({
    where: {
      nome: { contains: nome as string },
    },
    select: { id: true, nome: true, email: true, fotoPerfil: true },
  });

  res.json(usuarios);
});

app.post("/bloquear", autenticar, async (req, res) => {
  const { usuarioId } = req.body;
  const meuId = req.usuarioId as number;

  const bloqueio = await prisma.bloqueio.create({
    data: { bloqueadorId: meuId, bloqueadoId: usuarioId },
  });

  res.status(201).json(bloqueio);
});

/**
 * @swagger
 * /mensagens/{id}:
 *   delete:
 *     summary: Exclui uma mensagem própria
 *     tags: [Mensagens]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Mensagem excluída }
 *       403: { description: A mensagem é de outra pessoa }
 *       404: { description: Mensagem não encontrada }
 */
app.delete("/mensagens/:id", autenticar, async (req, res) => {
  const mensagemId = Number(req.params.id);
  const meuId = req.usuarioId as number;

  const mensagem = await prisma.mensagem.findUnique({ where: { id: mensagemId } });

  if (!mensagem) {
    return res.status(404).json({ erro: "Mensagem não encontrada" });
  }

  if (mensagem.remetenteId !== meuId) {
    return res.status(403).json({ erro: "Você não pode excluir essa mensagem" });
  }

  await prisma.mensagem.delete({ where: { id: mensagemId } });

  res.status(204).send();
});

export default app;
