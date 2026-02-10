import mysql from 'mysql2/promise';

console.log('DB 연결 설정:', {
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

export default pool;
