import request from "supertest";
import app from "../index";
import { prismaMock } from "../setup";
import bcrypt from "bcrypt";

describe("POST /login", () => {
  it("deve fazer login com sucesso e retornar um token", async () => {
    const senhaCriptografada = await bcrypt.hash("senha123", 10);

    const usuarioFalso = {
      id: 1,
      nome: "João",
      email: "joao@teste.com",
      senha: senhaCriptografada,
    };

    prismaMock.user.findUnique.mockResolvedValue(usuarioFalso as any);

    const resposta = await request(app).post("/login").send({
      email: "joao@teste.com",
      senha: "senha123",
    });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveProperty("token");
  });

  it("deve retornar erro 401 quando o email não existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const resposta = await request(app).post("/login").send({
      email: "naoexiste@teste.com",
      senha: "qualquercoisa",
    });

    expect(resposta.status).toBe(401);
  });

  it("deve retornar erro 401 quando a senha está incorreta", async () => {
    const senhaCriptografada = await bcrypt.hash("senhaCorreta", 10);

    const usuarioFalso = {
      id: 1,
      nome: "João",
      email: "joao@teste.com",
      senha: senhaCriptografada,
    };

    prismaMock.user.findUnique.mockResolvedValue(usuarioFalso as any);

    const resposta = await request(app).post("/login").send({
      email: "joao@teste.com",
      senha: "senhaErrada",
    });

    expect(resposta.status).toBe(401);
  });
});