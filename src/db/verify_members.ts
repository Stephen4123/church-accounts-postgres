import { query } from './index';

async function main() {
  const sample = await query(`SELECT member_code, title, nickname, name FROM members WHERE nickname != '' ORDER BY member_code LIMIT 10`);
  console.log('Sample members with nickname:');
  console.table(sample.rows);

  const titles = await query(`SELECT title, count(*)::int as count FROM members GROUP BY title ORDER BY count DESC`);
  console.log('Title counts:');
  console.table(titles.rows);

  const total = await query(`SELECT count(*)::int as total FROM members`);
  console.log('Total members in PostgreSQL:', total.rows[0].total);
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
