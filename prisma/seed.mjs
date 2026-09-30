import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const TZ = "America/New_York";
const PARK = "Chuck Rogers Park, 11950 San Jose Boulevard, Jacksonville, FL 32223";
const CAMP = "7510 Baymeadows Way, Jacksonville, FL 32256";

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
    weekday: "short",
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

const weekdayNumber = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function nextSlots(weekday, time, count) {
  const slots = [];
  let cursor = new Date();
  for (let i = 0; slots.length < count && i < 70; i += 1) {
    const parts = etParts(cursor);
    if (weekdayNumber[parts.weekday] === weekday) {
      const start = etToUtc(etDayKey(cursor), time);
      if (start.getTime() > Date.now() + 60 * 60 * 1000) slots.push(start);
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return slots;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = /neon\.tech/i.test(connectionString)
  ? ((neonConfig.webSocketConstructor = ws), new PrismaNeon({ connectionString, max: 1 }))
  : new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

const waiverSource = readFileSync(new URL("../lib/waiver-copy.ts", import.meta.url), "utf8");
const waiverBody = waiverSource.slice(waiverSource.indexOf("`") + 1, waiverSource.lastIndexOf("`"));

async function ensurePlan(data) {
  const existing = await prisma.plan.findUnique({ where: { seedKey: data.seedKey } });
  if (!existing) await prisma.plan.create({ data });
}

async function ensureSession(data) {
  const existing = await prisma.trainingSession.findUnique({ where: { seedKey: data.seedKey } });
  if (!existing) await prisma.trainingSession.create({ data });
}

async function main() {
  const current = await prisma.waiver.findFirst({ where: { isCurrent: true } });
  if (!current) {
    await prisma.waiver.create({ data: { body: waiverBody, isCurrent: true } });
  }

  await ensurePlan({
    seedKey: "speed-monthly",
    name: "Speed & Agility Monthly",
    program: "Speed & Agility",
    sessionsPerMonth: 8,
    priceCents: 27500,
    sortOrder: 1,
  });
  await ensurePlan({
    seedKey: "qb-monthly",
    name: "Quarterback Training Monthly",
    program: "Quarterback Training",
    sessionsPerMonth: 4,
    priceCents: 42500,
    sortOrder: 2,
  });

  const speed = {
    kind: "GROUP",
    program: "Speed & Agility",
    title: "Speed & agility",
    coach: "Ryan Walker",
    location: PARK,
    capacity: 16,
    priceCents: 4000,
    description: "Drop in any session for $40, or use the monthly plan.",
  };
  const patterns = [
    ["speed-thu", 4, "18:00", 60],
    ["speed-tue", 2, "18:00", 60],
    ["speed-sat", 6, "09:00", 60],
  ];
  for (const [key, weekday, time, minutes] of patterns) {
    const slots = nextSlots(weekday, time, 3);
    for (let i = 0; i < slots.length; i += 1) {
      await ensureSession({
        ...speed,
        seedKey: `${key}-${i + 1}`,
        startsAt: slots[i],
        endsAt: addMinutes(slots[i], minutes),
      });
    }
  }

  const qbGroup = [
    ["qb-ryan", 1, "17:30", "Ryan Walker", "Quarterback training with Ryan Walker"],
    ["qb-matt", 3, "17:30", "Matt Considine", "Quarterback training with Matt Considine"],
    ["qb-jim", 2, "18:30", "Jim McLeod", "Quarterback training with Jim McLeod"],
    ["qb-tannor", 4, "18:30", "Tannor Watson", "Quarterback training with Tannor Watson"],
  ];
  for (const [key, weekday, time, coach, title] of qbGroup) {
    const slots = nextSlots(weekday, time, 2);
    for (let i = 0; i < slots.length; i += 1) {
      await ensureSession({
        seedKey: `${key}-${i + 1}`,
        kind: "GROUP",
        program: "Quarterback Training",
        title,
        coach,
        location: PARK,
        capacity: 8,
        priceCents: 12500,
        startsAt: slots[i],
        endsAt: addMinutes(slots[i], 60),
        description: "Weekly quarterback training. $125 per session, or the monthly plan when this email has sessions left.",
      });
    }
  }

  const privates = nextSlots(5, "16:00", 3);
  for (let i = 0; i < privates.length; i += 1) {
    await ensureSession({
      seedKey: `qb-private-${i + 1}`,
      kind: "PRIVATE",
      program: "Quarterback Training",
      title: "Quarterback introduction with Ryan Walker",
      coach: "Ryan Walker",
      location: PARK,
      capacity: 1,
      priceCents: 12500,
      startsAt: privates[i],
      endsAt: addMinutes(privates[i], 60),
      description:
        "One-on-one introduction so the first instruction can be filmed for a pre and post coaching assessment.",
    });
  }

  const campSlots = nextSlots(6, "09:00", 4);
  const campStart = campSlots[campSlots.length - 1];
  if (campStart) {
    await ensureSession({
      seedKey: "qb-camp-1",
      kind: "CAMP",
      program: "Quarterback Training",
      title: "Elite Quarterback Camp",
      coach: "Ryan Walker",
      location: CAMP,
      capacity: 24,
      priceCents: 32500,
      startsAt: campStart,
      endsAt: addMinutes(campStart, 360),
      description:
        "Technique, drills, and film. Small-group quarterback training with film study, led by Coach Ryan Walker and staff. $325 per quarterback. Paid once. Receivers are a separate $30 add-on arranged with the academy.",
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
