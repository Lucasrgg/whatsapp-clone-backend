import request from "supertest";
import app from "../index";
import { prismaMock } from "../setup";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

describe("POST /usuarios", () => {
  it("deve criar um novo usuário com sucesso", async () => {
    const usuarioFalso = {
      id: 1,
      nome: "João",
      email: "joao@teste.com",
      senha: await bcrypt.hash("senha123", 10),
    };

    prismaMock.user.create.mockResolvedValue(usuarioFalso as any);

    const tokenFalso = jwt.sign(
      { id: 999, email: "logado@teste.com" },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    const resposta = await request(app)
      .post("/usuarios")
      .set("Authorization", `Bearer ${tokenFalso}`)
      .send({
        nome: "João",
        email: "joao@teste.com",
        senha: "senha123",
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.email).toBe("joao@teste.com");
  });
});