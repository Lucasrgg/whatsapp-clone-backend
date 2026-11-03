# 💬 WhatsApp Clone — Back-end

API REST com mensagens em tempo real, inspirada no WhatsApp. Cadastro e login com JWT, conversas entre usuários, envio de mensagens via WebSocket, upload de foto de perfil e bloqueio de usuários. Containerizada com Docker, testada com Jest e publicada na AWS.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-API%20REST-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Prisma%20ORM-4479A1?logo=mysql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Tempo%20real-010101?logo=socket.io&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Jest](https://img.shields.io/badge/Testes-Jest-C21325?logo=jest&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EC2%20%2B%20RDS-FF9900?logo=amazonaws&logoColor=white)

## 🔗 Demo ao vivo

| Recurso | Link |
| --- | --- |
| API | http://18.117.178.138:3000 |
| Documentação interativa (Swagger) | http://18.117.178.138:3000/api-docs |

> A API está hospedada em uma conta AWS no plano gratuito, então o link pode ficar indisponível depois que o período gratuito acabar. Nesse caso, o projeto roda localmente em poucos minutos (veja [Como rodar](#-como-rodar)).

## ✨ Funcionalidades

- **Autenticação**: cadastro com senha criptografada (bcrypt) e login com JWT
- **Logout seguro**: tokens invalidados entram em uma blacklist, então deixam de funcionar mesmo antes de expirar
- **Conversas**: criação e listagem de conversas entre usuários
- **Mensagens em tempo real**: envio e recebimento via Socket.IO, com salas (*rooms*) por conversa
- **Histórico**: consulta das mensagens de uma conversa e exclusão de mensagens (apenas o remetente pode excluir)
- **Perfil**: upload de foto de perfil com Multer
- **Busca**: pesquisa de usuários por nome
- **Bloqueio**: bloqueio de outros usuários
- **Documentação**: API documentada com Swagger/OpenAPI
- **Qualidade**: testes automatizados com Jest e Supertest

## 🛠️ Tecnologias

| Categoria | Tecnologias |
| --- | --- |
| Linguagem e runtime | TypeScript, Node.js 20 |
| Framework | Express |
| Banco de dados | MySQL + Prisma ORM |
| Tempo real | Socket.IO |
| Segurança | JWT (jsonwebtoken), bcrypt |
| Upload de arquivos | Multer |
| Testes | Jest, ts-jest, Supertest, jest-mock-extended |
| Documentação | Swagger (swagger-jsdoc + swagger-ui-express) |
| Infra e deploy | Docker, Docker Compose, AWS EC2, AWS RDS, PM2 |

## 🏗️ Arquitetura

```mermaid
flowchart LR
    C[Cliente<br/>Postman / Swagger / App] -->|HTTP REST| A
    C <-->|WebSocket| A
    subgraph EC2 [AWS EC2 · PM2]
        A[Express + Socket.IO]
        A --> M[Middleware de autenticação<br/>JWT + blacklist]
        M --> P[Prisma ORM]
    end
    P --> D[(MySQL · AWS RDS)]
```

Express e Socket.IO compartilham o mesmo servidor HTTP. As rotas protegidas passam pelo middleware de autenticação, que valida o JWT e consulta a blacklist de tokens antes de liberar o acesso.

## 📡 Endpoints

A lista completa, com exemplos de requisição e resposta, está no Swagger (`/api-docs`). Resumo:

| Método | Rota | Descrição | Exige token |
| --- | --- | --- | :---: |
| `POST` | `/usuarios` | Cadastra um usuário | ❌ |
| `POST` | `/login` | Autentica e retorna o token JWT | ❌ |
| `POST` | `/logout` | Invalida o token atual | ✅ |
| `GET` | `/usuarios` | Lista usuários | ✅ |
| `GET` | `/usuarios/buscar?nome=` | Busca usuários por nome | ✅ |
| `POST` | `/usuarios/foto` | Envia a foto de perfil (`multipart/form-data`) | ✅ |
| `POST` | `/bloquear` | Bloqueia um usuário | ✅ |
| `POST` | `/conversas` | Cria uma conversa | ✅ |
| `GET` | `/conversas` | Lista as conversas do usuário | ✅ |
| `POST` | `/mensagens` | Envia uma mensagem | ✅ |
| `GET` | `/conversas/:id/mensagens` | Lista as mensagens de uma conversa | ✅ |
| `DELETE` | `/mensagens/:id` | Exclui uma mensagem (só o remetente) | ✅ |

Rotas protegidas exigem o cabeçalho `Authorization: Bearer <token>`.

### Eventos Socket.IO

| Evento | Direção | Descrição |
| --- | --- | --- |
| `entrarConversa` | cliente → servidor | Entra na sala de uma conversa |
| `enviarMensagem` | cliente → servidor | Envia uma mensagem para a conversa |
| `novaMensagem` | servidor → clientes | Entrega a nova mensagem a quem está na sala |

## 🚀 Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [MySQL](https://www.mysql.com/) 8 (ou Docker, para subir o banco automaticamente)
- [Git](https://git-scm.com/)

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="mysql://USUARIO:SENHA@localhost:3306/whatsapp_clone"
JWT_SECRET="troque-por-uma-chave-longa-e-aleatoria"
PORT=3000
```

### Rodando localmente

```bash
# 1. Clone o repositório
git clone https://github.com/Lucasrgg/whatsapp-clone-backend.git
cd whatsapp-clone-backend

# 2. Instale as dependências
npm install

# 3. Crie o banco e aplique as migrations
npx prisma migrate deploy
npx prisma generate

# 4. Inicie em modo de desenvolvimento
npm run dev
```

O servidor sobe em `http://localhost:3000` e o Swagger fica em `http://localhost:3000/api-docs`.

### Rodando com Docker

```bash
docker compose up --build
```

Isso sobe a API (porta `3000`) e um MySQL local (porta `3307` no host). Se o banco estiver vazio, aplique as migrations apontando o `DATABASE_URL` para `localhost:3307`.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Inicia o servidor com recarga automática |
| `npm run build` | Compila o TypeScript para `dist/` |
| `npm start` | Inicia a versão compilada |
| `npm test` | Roda os testes automatizados |

## 🧪 Testes

```bash
npm test
```

São 12 testes em 6 suítes, cobrindo cadastro, login (incluindo casos de erro), conversas, mensagens (incluindo a regra de que só o remetente exclui), bloqueio e a rota raiz. O Prisma é simulado (*mock*) com `jest-mock-extended`, então os testes rodam rápido e **não precisam de banco de dados**.

## ☁️ Deploy

- **Servidor**: AWS EC2 (Amazon Linux 2023)
- **Banco de dados**: AWS RDS (MySQL)
- **Processo**: PM2 mantendo a aplicação no ar e reiniciando junto com o servidor (serviço systemd)
- **Atualização**: `git pull` → `npm install` → `npm run build` → `pm2 restart`

## 🧠 Decisões técnicas

- **Senhas nunca são devolvidas**: todas as consultas usam `select` explícito, então o hash da senha não vaza nas respostas, nem nas de conversas e mensagens.
- **Logout com blacklist**: o JWT é stateless e continuaria válido até expirar. A blacklist garante que o logout tenha efeito imediato.
- **Salas por conversa no Socket.IO**: cada mensagem é entregue só a quem participa da conversa, em vez de ser enviada para todos os usuários conectados.
- **Autorização na exclusão**: a API confere se quem pede a exclusão é o remetente da mensagem.
- **Testes isolados do banco**: o Prisma mockado deixa a suíte rápida e evita qualquer risco de tocar em dados reais.
- **Ambientes reproduzíveis**: Docker Compose sobe a API e o banco com um comando.
- **Socket.IO autenticado**: a conexão exige um JWT válido (e fora da blacklist). O remetente das mensagens vem do token, nunca do cliente, e só participantes da conversa podem entrar na sala e enviar mensagens.

## 🗺️ Próximos passos

- [x] Validar o JWT no *handshake* do Socket.IO
- [ ] HTTPS com domínio próprio
- [ ] Limite de requisições (*rate limiting*) nas rotas de login e cadastro
- [ ] Pipeline de CI para rodar os testes a cada push

## 👨‍💻 Autor

**Lucas Garcia**

- GitHub: [@Lucasrgg](https://github.com/Lucasrgg)
- LinkedIn: https://www.linkedin.com/in/lucas-rodrigues-garcia-dev/

---

Projeto desenvolvido para fins de estudo e portfólio.
