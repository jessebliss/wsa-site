-- Remove the 4-time quarterback plan once Monthly unlimited group is already stored.
-- Subscription rows stay, with the plan name copied on, and the plan link cleared by the foreign key.
UPDATE "subscriptions" AS s
SET "planName" = p.name
FROM "plans" AS p
WHERE s."planId" = p.id
  AND s."planName" = ''
  AND (
    p."seedKey" = 'qb-monthly'
    OR (
      p.name = 'Quarterback Training Monthly'
      AND p.program = 'Quarterback Training'
      AND p."sessionsPerMonth" = 4
      AND p."billingInterval" = 'MONTH'
    )
  )
  AND EXISTS (SELECT 1 FROM "plans" AS r WHERE r."seedKey" = 'group-unlimited-month');

DELETE FROM "plans" AS p
WHERE (
  p."seedKey" = 'qb-monthly'
  OR (
    p.name = 'Quarterback Training Monthly'
    AND p.program = 'Quarterback Training'
    AND p."sessionsPerMonth" = 4
    AND p."billingInterval" = 'MONTH'
  )
)
AND p."seedKey" IS DISTINCT FROM 'group-unlimited-month'
AND EXISTS (SELECT 1 FROM "plans" AS r WHERE r."seedKey" = 'group-unlimited-month');

-- A leftover "Speed & Agility Monthly" row goes only when Monthly Speed & Agility is a different plan.
UPDATE "subscriptions" AS s
SET "planName" = p.name
FROM "plans" AS p
WHERE s."planId" = p.id
  AND s."planName" = ''
  AND p.name = 'Speed & Agility Monthly'
  AND EXISTS (
    SELECT 1 FROM "plans" AS n
    WHERE n."seedKey" = 'speed-monthly'
      AND n.name = 'Monthly Speed & Agility'
      AND n.id <> p.id
  );

DELETE FROM "plans" AS p
WHERE p.name = 'Speed & Agility Monthly'
  AND EXISTS (
    SELECT 1 FROM "plans" AS n
    WHERE n."seedKey" = 'speed-monthly'
      AND n.name = 'Monthly Speed & Agility'
      AND n.id <> p.id
  );
