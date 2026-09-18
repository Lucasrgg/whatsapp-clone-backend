import request from "supertest";
import app from "../index";
import { prismaMock } from "../setup";
import jwt from "jsonwebtoken";

const tokenFalso = jwt.sign(
  { id: 1, email: "logado@teste.com" },
  process.env.JWT_SECRET as string,
  { expiresIn: "1h" }
);

describe("POST /mensagens", () => {
  it("deve enviar uma mensagem com sucesso", async () => {
    const mensagemFalsa = {
      id: 1,
      conteudo: "Oi, tudo bem?",
      conversaId: 1,
      remetenteId: 1,
    };

    prismaMock.mensagem.create.mockResolvedValue(mensagemFalsa as any);

    const resposta = await request(app)
      .post("/mensagens")
      .set("Authorization", `Bearer ${tokenFalso}`)
      .send({ conversaId: 1, conteudo: "Oi, tudo bem?" });

    expect(resposta.status).toBe(201);
    expect(resposta.body.conteudo).toBe("Oi, tudo bem?");
  });
});

describe("GET /conversas/:id/mensagens", () => {
  it("deve listar as mensagens de uma conversa", async () => {
    const mensagensFalsas = [
      { id: 1, conteudo: "Oi!", conversaId: 1, remetenteId: 1 },
    ];

    prismaMock.mensagem.findMany.mockResolvedValue(mensagensFalsas as any);

    const resposta = await request(app)
      .get("/conversas/1/mensagens")
      .set("Authorization", `Bearer ${tokenFalso}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
  });
});

describe("DELETE /mensagens/:id", () => {
  it("deve excluir uma mensagem própria com sucesso", async () => {
    const mensagemExistente = {
      id: 1,
      conteudo: "Oi!",
      conversaId: 1,
      remetenteId: 1,
    };

    prismaMock.mensagem.findUnique.mockResolvedValue(mensagemExistente as any);
    prismaMock.mensagem.delete.mockResolvedValue(mensagemExistente as any);

    const resposta = await request(app)
      .delete("/mensagens/1")
      .set("Authorization", `Bearer ${tokenFalso}`);

    expect(resposta.status).toBe(204);
  });

  it("deve retornar erro 403 ao tentar excluir mensagem de outra pessoa", async () => {
    const mensagemDeOutro = {
      id: 1,
      conteudo: "Oi!",
      conversaId: 1,
      remetenteId: 999,
    };

    prismaMock.mensagem.findUnique.mockResolvedValue(mensagemDeOutro as any);

    const resposta = await request(app)
      .delete("/mensagens/1")
      .set("Authorization", `Bearer ${tokenFalso}`);

    expect(resposta.status).toBe(403);
  });
});