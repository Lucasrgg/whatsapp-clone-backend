import { PrismaClient } from "./generated/prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

jest.mock("./generated/prisma/client", () => {
  const actual = jest.requireActual("./generated/prisma/client");
  return {
    ...actual,
    PrismaClient: jest.fn(() => prismaMock),
  };
});

export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});