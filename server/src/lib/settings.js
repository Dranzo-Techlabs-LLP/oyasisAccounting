import { prisma } from "./prisma.js";

let cached = null;

export const getSettings = async () => {
  if (cached) return cached;
  cached = await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {}
  });
  return cached;
};

export const invalidateSettings = () => {
  cached = null;
};
