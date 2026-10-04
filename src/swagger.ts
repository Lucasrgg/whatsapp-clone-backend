import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WhatsApp Clone API",
      version: "1.0.0",
      description: "API de mensagens em tempo real (back-end de um clone do WhatsApp)",
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  // lê os comentários do index (.ts em desenvolvimento, .js depois do build)
  apis: [path.join(__dirname, "index.{ts,js}")],
});