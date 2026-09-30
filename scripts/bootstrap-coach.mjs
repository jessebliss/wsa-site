import "dotenv/config";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const TZ = "America/New_York";
const COACH = "Matt Considine";
const EMAIL = "matt@walkersportsacademy.com";
const QB_OFFERINGS = [
  ["Matt Considine", "Quarterback training with Matt Considine"],
  ["Jim McLeod", "Quarterback training with Jim McLeod"],
  ["Tannor Watson", "Quarterback training with Tannor Watson"],
];

const scryptAsync = promisify(scrypt);

function etParts(date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  if (map.hour === "24") map.hour = "00";
  return map;
}

function etDayKey(date) {
  const parts = etParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function tzOffsetMs(instant) {
  const parts = etParts(instant);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

function etToUtc(date, time) {
  const utcGuess = new Date(`${date}T${time}:00Z`);
  const offset = tzOffsetMs(utcGuess);
  const adjusted = new Date(utcGuess.getTime() - offset);
  const second = tzOffsetMs(adjusted);
  if (second !== offset) return new Date(utcGuess.getTime() - second);
  return adjusted;
}

function hoursCoveredBySession(startsAt, endsAt) {
  const startParts = etParts(startsAt);
  const endParts = etParts(endsAt);
  const startMin = Number(startParts.hour) * 60 + Number(startParts.minute);
  let endMin = Number(endParts.hour) * 60 + Number(endParts.minute);
  if (etDayKey(endsAt) !== etDayKey(startsAt)) endMin += 24 * 60;
  if (endMin <= startMin) endMin = startMin + 60;
  const hours = [];
  for (let minute = Math.floor(startMin / 60) * 60; minute < endMin; minute += 60) {
    hours.push(Math.floor(minute / 60) % 24);
  }
  return hours;
}

function createPrisma() {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  if (/neon\.tech/i.test(connectionString)) {
    neonConfig.webSocketConstructor = ws;
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString, max: 1 }) });
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function alignPrices(prisma) {
  let updated = 0;
  for (const [coach, title] of QB_OFFERINGS) {
    const rows = await prisma.trainingSession.findMany({
      where: { coach, title },
      select: { id: true, priceCents: true, description: true },
    });
    for (const row of rows) {
      const description = row.description?.includes("$125") ? row.description.replaceAll("$125", "$80") : row.description;
      const priceCents = row.priceCents === 12500 ? 8000 : row.priceCents;
      if (priceCents === row.priceCents && description === row.description) continue;
      await prisma.trainingSession.update({
        where: { id: row.id },
        data: { priceCents, description },
      });
      updated += 1;
    }
  }
  return updated;
}

async function starterDays(prisma, staffUserId) {
  const existing = await prisma.coachDay.count({ where: { staffUserId } });
  if (existing > 0) return "kept existing days";
  const today = etDayKey(new Date());
  const start = etToUtc(today, "00:00");
  const end = new Date(start.getTime() + 8 * 24 * 60 * 60 * 1000);
  const sessions = await prisma.trainingSession.findMany({
    where: { coach: COACH, status: "SCHEDULED", startsAt: { gte: start, lt: end } },
    select: { startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
  });
  const byDay = new Map();
  for (const session of sessions) {
    const dayKey = etDayKey(session.startsAt);
    const hours = new Set(byDay.get(dayKey) ?? []);
    for (const hour of hoursCoveredBySession(session.startsAt, session.endsAt)) hours.add(hour);
    byDay.set(dayKey, hours);
  }
  if (byDay.size === 0) return "no Matt sessions in the next 8 days";
  const saved = [];
  for (const [dayKey, hours] of byDay) {
    const list = [...hours].sort((a, b) => a - b);
    await prisma.coachDay.create({
      data: { staffUserId, dayKey, unavailable: false, hours: list },
    });
    saved.push(`${dayKey} [${list.join(",")}]`);
  }
  return saved.join("; ");
}

async function main() {
  if (process.env.VERCEL_ENV !== "production") return;
  const password = process.env.MATT_BOOTSTRAP_PASSWORD;
  if (!password) {
    console.log("coach bootstrap skipped");
    return;
  }
  if (password.length < 8) throw new Error("Coach bootstrap password is too short.");
  const prisma = createPrisma();
  try {
    const prices = await alignPrices(prisma);
    let staff = await prisma.staffUser.findFirst({
      where: { OR: [{ email: EMAIL }, { coachName: COACH }] },
    });
    let created = false;
    if (!staff) {
      staff = await prisma.staffUser.create({
        data: { name: COACH, email: EMAIL, coachName: COACH, passwordHash: await hashPassword(password) },
      });
      created = true;
    } else if (staff.email !== EMAIL || staff.coachName !== COACH) {
      throw new Error("Matt's login email and schedule name do not match one staff row.");
    }
    const starter = await starterDays(prisma, staff.id);
    console.log(`coach bootstrap prices=${prices} created=${created} starter=${starter}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Coach bootstrap failed");
  process.exit(1);
});
