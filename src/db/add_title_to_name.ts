import { query } from './index';
import fs from 'fs';
import path from 'path';

async function addTitleToName() {
  console.log('Attaching title to name column in members table...');

  // Standardize titles first
  await query(`UPDATE members SET title = 'Br.' WHERE title IN ('Brother', 'Bro', 'Bro.')`);
  await query(`UPDATE members SET title = 'Sr.' WHERE title IN ('Sister', 'Sis', 'Sis.')`);
  await query(`UPDATE members SET title = 'Pr.' WHERE title IN ('Pastor')`);
  await query(`UPDATE members SET title = 'Evg.' WHERE title IN ('Evangelist')`);

  const res = await query(`SELECT id, member_code, title, nickname, name FROM members ORDER BY id ASC`);
  console.log(`Processing ${res.rows.length} members...`);

  let updatedCount = 0;
  for (const m of res.rows) {
    let title = (m.title || '').trim();
    let name = (m.name || '').trim();
    const nickname = (m.nickname || '').trim();

    // Remove any existing prefix to get raw clean name
    const rawName = name.replace(/^(Br|Sr|Pr|Evg|Bro|Brother|Sister|Sis|Pastor|Evangelist)\.?\s+/i, '').trim();

    // Formulate final name with title
    let finalName = title ? `${title} ${rawName}` : rawName;

    if (finalName !== m.name) {
      await query(`UPDATE members SET name = $1, title = $2 WHERE id = $3`, [finalName, title, m.id]);
      updatedCount++;
    }
  }

  console.log(`✅ Updated ${updatedCount} members to have title included with name.`);

  const sample = await query(`SELECT member_code, title, name, nickname FROM members ORDER BY member_code LIMIT 15`);
  console.log('Sample members after update:');
  console.table(sample.rows);

  // Update public/data/local_db.json
  const publicLocalDbPath = path.join(__dirname, '../../public/data/local_db.json');
  if (fs.existsSync(publicLocalDbPath)) {
    try {
      const pubData = JSON.parse(fs.readFileSync(publicLocalDbPath, 'utf8').replace(/^\uFEFF/, ''));
      if (pubData.members) {
        pubData.members = pubData.members.map((mem: any) => {
          let t = (mem.title || '').trim();
          if (['Brother', 'Bro', 'Bro.'].includes(t)) t = 'Br.';
          if (['Sister', 'Sis', 'Sis.'].includes(t)) t = 'Sr.';
          if (['Pastor'].includes(t)) t = 'Pr.';
          if (['Evangelist'].includes(t)) t = 'Evg.';

          let n = (mem.name || '').trim();
          const raw = n.replace(/^(Br|Sr|Pr|Evg|Bro|Brother|Sister|Sis|Pastor|Evangelist)\.?\s+/i, '').trim();
          const finalN = t ? `${t} ${raw}` : raw;

          return {
            ...mem,
            title: t,
            name: finalN
          };
        });
        fs.writeFileSync(publicLocalDbPath, JSON.stringify(pubData, null, 2), 'utf8');
        console.log('✅ Updated public/data/local_db.json.');
      }
    } catch (e: any) {
      console.warn('Could not update local_db.json:', e.message);
    }
  }
}

addTitleToName().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
