import { query } from './index';
import fs from 'fs';
import path from 'path';

async function cleanMemberNames() {
  const res = await query(`SELECT id, member_code, title, nickname, name FROM members ORDER BY id ASC`);
  console.log(`Checking ${res.rows.length} members...`);

  let updatedCount = 0;
  for (const m of res.rows) {
    const origName = m.name || '';
    let currentTitle = m.title || '';
    let currentNick = m.nickname || '';

    // Check if title can be extracted if not already set
    if (!currentTitle) {
      if (/^Br\.?\b|^Brother\b|^Bro\.?\b/i.test(origName)) currentTitle = 'Br.';
      else if (/^Pr\.?\b|^Pastor\b/i.test(origName)) currentTitle = 'Pr.';
      else if (/^Sr\.?\b|^Sister\b|^Sis\.?\b/i.test(origName)) currentTitle = 'Sr.';
      else if (/^Evg\.?\b|^Evangelist\b/i.test(origName)) currentTitle = 'Evg.';
    }

    // Strip prefix from name: Br., Sr., Pr., Evg., etc.
    let cleanName = origName.replace(/^(Br|Sr|Pr|Evg|Bro|Brother|Sister|Sis|Pastor|Evangelist)\.?\s+/i, '').trim();

    // Also strip any remaining (nickname) in name if present
    const nickMatch = cleanName.match(/\(([^)]+)\)/);
    if (nickMatch) {
      if (!currentNick) currentNick = nickMatch[1].trim();
      cleanName = cleanName.replace(/\s*\([^)]+\)/, '').trim();
    }

    if (cleanName !== origName || currentTitle !== m.title || currentNick !== m.nickname) {
      console.log(`Member ${m.member_code}: "${origName}" -> Title="${currentTitle}", Name="${cleanName}", Nickname="${currentNick}"`);
      await query(`UPDATE members SET title = $1, name = $2, nickname = $3 WHERE id = $4`, [
        currentTitle, cleanName, currentNick, m.id
      ]);
      updatedCount++;
    }
  }

  // Standardize titles
  await query(`UPDATE members SET title = 'Br.' WHERE title IN ('Brother', 'Bro', 'Bro.')`);
  await query(`UPDATE members SET title = 'Sr.' WHERE title IN ('Sister', 'Sis', 'Sis.')`);
  await query(`UPDATE members SET title = 'Pr.' WHERE title IN ('Pastor')`);
  await query(`UPDATE members SET title = 'Evg.' WHERE title IN ('Evangelist')`);

  const titlesRes = await query(`SELECT title, count(*)::int as count FROM members GROUP BY title ORDER BY count DESC`);
  console.log('Distinct titles in PostgreSQL:');
  console.table(titlesRes.rows);

  const sample = await query(`SELECT member_code, title, name, nickname FROM members ORDER BY member_code LIMIT 15`);
  console.log('Sample members:');
  console.table(sample.rows);

  // Update public/data/local_db.json
  const publicLocalDbPath = path.join(__dirname, '../../public/data/local_db.json');
  if (fs.existsSync(publicLocalDbPath)) {
    try {
      const pubData = JSON.parse(fs.readFileSync(publicLocalDbPath, 'utf8').replace(/^\uFEFF/, ''));
      if (pubData.members) {
        pubData.members = pubData.members.map((mem: any) => {
          let origName = mem.name || '';
          let t = mem.title || '';
          let nick = mem.nickname || '';

          if (!t) {
            if (/^Br\.?\b|^Brother\b|^Bro\.?\b/i.test(origName)) t = 'Br.';
            else if (/^Pr\.?\b|^Pastor\b/i.test(origName)) t = 'Pr.';
            else if (/^Sr\.?\b|^Sister\b|^Sis\.?\b/i.test(origName)) t = 'Sr.';
            else if (/^Evg\.?\b|^Evangelist\b/i.test(origName)) t = 'Evg.';
          }

          let cleanName = origName.replace(/^(Br|Sr|Pr|Evg|Bro|Brother|Sister|Sis|Pastor|Evangelist)\.?\s+/i, '').trim();
          const nMatch = cleanName.match(/\(([^)]+)\)/);
          if (nMatch) {
            if (!nick) nick = nMatch[1].trim();
            cleanName = cleanName.replace(/\s*\([^)]+\)/, '').trim();
          }

          return {
            ...mem,
            title: t,
            name: cleanName,
            nickname: nick
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

cleanMemberNames().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
