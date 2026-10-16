import { query, isPostgres } from './index';
import fs from 'fs';
import path from 'path';

export async function addNicknameColumn() {
  if (!isPostgres()) {
    console.log('Not connected to PostgreSQL');
    return;
  }

  console.log('Adding nickname column to members table...');
  await query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) DEFAULT ''`);

  // Fetch all members
  const res = await query(`SELECT id, member_code, name, COALESCE(title, '') as title, COALESCE(nickname, '') as nickname FROM members ORDER BY id ASC`);
  console.log(`Analyzing ${res.rows.length} members...`);

  let countWithNick = 0;
  for (const m of res.rows) {
    let name = m.name || '';
    let nickname = m.nickname || '';

    // Check if name has (Nickname) pattern, e.g. "Sr. Ammini Joseph (Babu)"
    const match = name.match(/\(([^)]+)\)/);
    if (match) {
      nickname = match[1].trim();
      const cleanName = name.replace(/\s*\([^)]+\)/, '').trim();
      console.log(`Member ${m.member_code}: Name="${name}" -> CleanName="${cleanName}", Nickname="${nickname}"`);
      await query(`UPDATE members SET name = $1, nickname = $2 WHERE id = $3`, [cleanName, nickname, m.id]);
      countWithNick++;
    }
  }

  console.log(`✅ Extracted nicknames for ${countWithNick} members.`);

  // Update public/data/local_db.json
  const publicLocalDbPath = path.join(__dirname, '../../public/data/local_db.json');
  if (fs.existsSync(publicLocalDbPath)) {
    try {
      const pubData = JSON.parse(fs.readFileSync(publicLocalDbPath, 'utf8').replace(/^\uFEFF/, ''));
      if (pubData.members) {
        pubData.members = pubData.members.map((mem: any) => {
          let name = mem.name || '';
          let nick = mem.nickname || '';
          const mMatch = name.match(/\(([^)]+)\)/);
          if (mMatch) {
            nick = mMatch[1].trim();
            name = name.replace(/\s*\([^)]+\)/, '').trim();
          }
          return {
            ...mem,
            name,
            nickname: nick
          };
        });
        fs.writeFileSync(publicLocalDbPath, JSON.stringify(pubData, null, 2), 'utf8');
        console.log('✅ Updated public/data/local_db.json with member nicknames.');
      }
    } catch (e: any) {
      console.warn('Could not update local_db.json:', e.message);
    }
  }
}

if (require.main === module) {
  addNicknameColumn().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
