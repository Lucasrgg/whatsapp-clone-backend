import request from "supertest";
import app from "../index";
import { prismaMock } from "../setup";
import jwt from "jsonwebtoken";

const tokenFalso = jwt.sign(
  { id: 1, email: "logado@teste.com" },
  process.env.JWT_SECRET as string,
  { expiresIn: "1h" }
);

describe("POST /conversas", () => {
  it("deve criar uma nova conversa com sucesso", async () => {
    const conversaFalsa = {
      id: 1,
      participantes: [{ id: 1 }, { id: 2 }],
    };

    prismaMock.conversa.create.mockResolvedValue(conversaFalsa as any);

    const resposta = await request(app)
      .post("/conversas")
      .set("Authorization", `Bearer ${tokenFalso}`)
      .send({ participanteId: 2 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.id).toBe(1);
  });
});

describe("GET /conversas", () => {
  it("deve listar as conversas do usuário logado", async () => {
    const conversasFalsas = [
      { id: 1, participantes: [{ id: 1 }, { id: 2 }] },
    ];

    prismaMock.conversa.findMany.mockResolvedValue(conversasFalsas as any);

    const resposta = await request(app)
      .get("/conversas")
      .set("Authorization", `Bearer ${tokenFalso}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
  });
});