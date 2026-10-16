import { query, isPostgres } from './index';
import fs from 'fs';
import path from 'path';

export async function addTitleColumn() {
  if (!isPostgres()) {
    console.log('Not connected to PostgreSQL');
    return;
  }

  console.log('Adding title column to members table...');
  await query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS title VARCHAR(50) DEFAULT ''`);

  // Fetch all members
  const res = await query(`SELECT id, name FROM members ORDER BY id ASC`);
  console.log(`Analyzing ${res.rows.length} members to extract titles...`);

  for (const m of res.rows) {
    const name = m.name || '';
    let title = '';

    if (/^Br\.?\b|^Brother\b|^Bro\.?\b/i.test(name)) {
      title = 'Br.';
    } else if (/^Pr\.?\b|^Pastor\b/i.test(name)) {
      title = 'Pr.';
    } else if (/^Sr\.?\b|^Sister\b|^Sis\.?\b/i.test(name)) {
      title = 'Sr.';
    } else if (/^Evg\.?\b|^Evangelist\b/i.test(name)) {
      title = 'Evg.';
    }

    if (title) {
      await query(`UPDATE members SET title = $1 WHERE id = $2`, [title, m.id]);
    }
  }

  const updatedRes = await query(`
    SELECT title, count(*)::int as count 
    FROM members 
    GROUP BY title 
    ORDER BY count DESC
  `);
  console.log('✅ Title breakdown in members table:', updatedRes.rows);

  // Update public/data/local_db.json
  const publicLocalDbPath = path.join(__dirname, '../../public/data/local_db.json');
  if (fs.existsSync(publicLocalDbPath)) {
    try {
      const pubData = JSON.parse(fs.readFileSync(publicLocalDbPath, 'utf8').replace(/^\uFEFF/, ''));
      if (pubData.members) {
        pubData.members = pubData.members.map((mem: any) => {
          let t = '';
          const n = mem.name || '';
          if (/^Br\.?\b|^Brother\b|^Bro\.?\b/i.test(n)) t = 'Br.';
          else if (/^Pr\.?\b|^Pastor\b/i.test(n)) t = 'Pr.';
          else if (/^Sr\.?\b|^Sister\b|^Sis\.?\b/i.test(n)) t = 'Sr.';
          else if (/^Evg\.?\b|^Evangelist\b/i.test(n)) t = 'Evg.';
          return { ...mem, title: t };
        });
        fs.writeFileSync(publicLocalDbPath, JSON.stringify(pubData, null, 2), 'utf8');
        console.log('✅ Updated public/data/local_db.json with member titles.');
      }
    } catch (e: any) {
      console.warn('Could not update local_db.json:', e.message);
    }
  }
}

if (require.main === module) {
  addTitleColumn().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
