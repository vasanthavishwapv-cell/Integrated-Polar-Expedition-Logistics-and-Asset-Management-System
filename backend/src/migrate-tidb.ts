import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function migrateTiDB() {
  console.log('Connecting to TiDB Cloud (polaris database)...');
  const conn = await mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'rgmbUv4YZ4mqNqK.root',
    password: 'uqwEJjhsQEpXQWK5',
    database: 'polaris',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    multipleStatements: true,
  });

  console.log('Reading schema.sql...');
  const schemaPath = path.resolve(__dirname, '../../docs/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Remove CREATE DATABASE and USE statements since we are already connected to polaris
  const cleanedSql = sql
    .replace(/CREATE DATABASE IF NOT EXISTS polaris;/gi, '')
    .replace(/USE polaris;/gi, '');

  console.log('Executing tables creation & seed on TiDB Cloud...');
  await conn.query(cleanedSql);
  console.log('✅ All tables and initial seed data created successfully on TiDB Cloud!');

  // Verify tables
  const [tables]: any = await conn.query('SHOW TABLES');
  console.log('Tables in polaris database:', tables.map((t: any) => Object.values(t)[0]));

  // Verify users
  const [users]: any = await conn.query('SELECT name, email, role FROM users');
  console.log('Users seeded in TiDB:', users);

  await conn.end();
}

migrateTiDB().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
