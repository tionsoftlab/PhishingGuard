import { config } from 'dotenv';
import { resolve } from 'path';
import mysql from 'mysql2/promise';

config({ path: resolve(process.cwd(), '.env.local') });

console.log('환경변수 확인:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  hasPassword: !!process.env.DB_PASSWORD
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'security_platform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testConnection() {
  try {
    console.log('데이터베이스 연결 테스트 시작...');
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('연결 성공:', rows);
    
    const [databases] = await pool.query('SHOW DATABASES');
    console.log('사용 가능한 데이터베이스:', databases);
    
    const [current] = await pool.query('SELECT DATABASE() as current_db');
    console.log('현재 데이터베이스:', current);
    
    const [tables] = await pool.query('SHOW TABLES');
    console.log('테이블 목록:', tables);
    
    process.exit(0);
  } catch (error) {
    console.error('데이터베이스 연결 실패:', error);
    process.exit(1);
  }
}

testConnection();
