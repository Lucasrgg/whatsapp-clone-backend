import request from "supertest";
import app from "../index";

describe("GET /", () => {
  it("deve retornar a mensagem de servidor rodando", async () => {
    const resposta = await request(app).get("/");
    expect(resposta.status).toBe(200);
    expect(resposta.text).toBe("Servidor rodando!");
  });
});
