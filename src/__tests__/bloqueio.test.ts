import request from "supertest";
import app from "../index";
import { prismaMock } from "../setup";
import jwt from "jsonwebtoken";

const tokenFalso = jwt.sign(
  { id: 1, email: "logado@teste.com" },
  process.env.JWT_SECRET as string,
  { expiresIn: "1h" }
);

describe("POST /bloquear", () => {
  it("deve bloquear um usuário com sucesso", async () => {
    const bloqueioFalso = {
      id: 1,
      bloqueadorId: 1,
      bloqueadoId: 2,
    };

    prismaMock.bloqueio.create.mockResolvedValue(bloqueioFalso as any);

    const resposta = await request(app)
      .post("/bloquear")
      .set("Authorization", `Bearer ${tokenFalso}`)
      .send({ usuarioId: 2 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.bloqueadoId).toBe(2);
  });
});