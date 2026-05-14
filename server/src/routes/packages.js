import { PackageStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const router = Router();

const packageSchema = z.object({
  name: z.string().min(2),
  destination: z.string().min(2),
  durationDays: z.coerce.number().int().min(1),
  durationNights: z.coerce.number().int().min(0),
  inclusions: z.object({
    flights: z.boolean(),
    hotels: z.boolean(),
    meals: z.boolean(),
    transfers: z.boolean()
  }),
  priceAdult: z.coerce.number().min(0),
  priceChild: z.coerce.number().min(0),
  maxPax: z.coerce.number().int().min(1),
  availableDates: z.array(z.string()),
  status: z.nativeEnum(PackageStatus),
  coverImageUrl: z.string().url().or(z.literal("")).optional()
});

router.get("/", async (req, res) => {
  const { q = "", destination, status } = req.query;
  const packages = await prisma.package.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: String(q) } },
                { destination: { contains: String(q) } }
              ]
            }
          : {},
        destination ? { destination: String(destination) } : {},
        status ? { status: String(status) } : {}
      ]
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ items: packages });
});

router.post("/", async (req, res) => {
  const data = packageSchema.parse(req.body);
  const created = await prisma.package.create({
    data: {
      ...data,
      priceAdult: data.priceAdult,
      priceChild: data.priceChild,
      coverImageUrl: data.coverImageUrl || null
    }
  });
  res.status(201).json(created);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const data = packageSchema.parse(req.body);
  const updated = await prisma.package.update({
    where: { id },
    data: {
      ...data,
      coverImageUrl: data.coverImageUrl || null
    }
  });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.package.delete({ where: { id } });
  res.json({ message: "Package deleted" });
});

export default router;
