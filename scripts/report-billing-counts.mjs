import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("billing_report skipped");
  process.exit(0);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const invoices = await client.query("SELECT count(*)::int AS n FROM invoices");
  const subscriptions = await client.query("SELECT count(*)::int AS n FROM subscriptions");
  const sequence = await client.query(`SELECT "nextNumber" AS n FROM invoice_sequences WHERE id = 'site'`);
  const stats = await client.query(`
    SELECT relname, n_live_tup::int AS live, n_tup_ins::int AS inserted, n_tup_del::int AS deleted
    FROM pg_stat_user_tables
    WHERE relname IN ('invoices', 'subscriptions')
    ORDER BY relname
  `);
  console.log(
    "billing_report " +
      JSON.stringify({
        invoices: invoices.rows[0]?.n ?? null,
        subscriptions: subscriptions.rows[0]?.n ?? null,
        nextNumber: sequence.rows[0]?.n ?? null,
        stats: stats.rows,
      }),
  );
} catch (error) {
  const message = String(error?.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]");
  console.log("billing_report error " + message.slice(0, 200));
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
