import { query, isPostgres } from './index';
import fs from 'fs';
import path from 'path';

export async function cleanTitlesNoDot() {
  if (!isPostgres()) return;

  console.log('Standardizing titles to clean Br, Sr, Pr, Evg (no dots, no full words)...');

  // 1. Update PostgreSQL members table
  await query(`UPDATE members SET title = 'Br' WHERE title IN ('Br.', 'Brother', 'Bro', 'Bro.', 'br', 'br.')`);
  await query(`UPDATE members SET title = 'Sr' WHERE title IN ('Sr.', 'Sister', 'Sis', 'Sis.', 'sr', 'sr.')`);
  await query(`UPDATE members SET title = 'Pr' WHERE title IN ('Pr.', 'Pastor', 'pr', 'pr.')`);
  await query(`UPDATE members SET title = 'Evg' WHERE title IN ('Evg.', 'Evangelist', 'evg', 'evg.')`);

  const mems = await query(`SELECT id, name FROM members`);
  for (const m of mems.rows) {
    const raw = (m.name || '').replace(/^(Br|Sr|Pr|Evg|Bro|Brother|Sister|Sis|Pastor|Evangelist)\.?\s+/i, '').trim();
    if (raw !== m.name) {
      await query(`UPDATE members SET name = $1 WHERE id = $2`, [raw, m.id]);
    }
  }

  // Verify titles
  const counts = await query(`SELECT title, count(*)::int as count FROM members GROUP BY title ORDER BY count DESC`);
  console.log('PostgreSQL Title breakdown:');
  console.table(counts.rows);

  const sample = await query(`SELECT id, member_code, title, name, nickname FROM members ORDER BY member_code LIMIT 10`);
  console.log('Sample updated members:');
  console.table(sample.rows);

  // 2. Update local_db.json
  const publicLocalDbPath = path.join(__dirname, '../../public/data/local_db.json');
  if (fs.existsSync(publicLocalDbPath)) {
    try {
      const pubData = JSON.parse(fs.readFileSync(publicLocalDbPath, 'utf8').replace(/^\uFEFF/, ''));
      if (pubData.members) {
        pubData.members = pubData.members.map((mem: any) => {
          let t = (mem.title || '').trim();
          if (/^Br\.?\b|^Brother\b|^Bro\.?\b/i.test(t)) t = 'Br';
          else if (/^Pr\.?\b|^Pastor\b/i.test(t)) t = 'Pr';
          else if (/^Sr\.?\b|^Sister\b|^Sis\.?\b/i.test(t)) t = 'Sr';
          else if (/^Evg\.?\b|^Evangelist\b/i.test(t)) t = 'Evg';

          return {
            ...mem,
            title: t
          };
        });
        fs.writeFileSync(publicLocalDbPath, JSON.stringify(pubData, null, 2), 'utf8');
        console.log('✅ Updated public/data/local_db.json with standardized titles (Br, Sr, Pr, Evg).');
      }
    } catch (e: any) {
      console.warn('Could not update local_db.json:', e.message);
    }
  }
}

if (require.main === module) {
  cleanTitlesNoDot().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
