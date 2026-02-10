import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const connection = await pool.getConnection();

    try {
      const [users] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = users[0].id;

      const [scans] = await connection.query<RowDataPacket[]>(
        `SELECT id, scan_type, scan_target, result, risk_score, created_at, easy_summary, expert_summary 
         FROM scan_history 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [userId]
      );

      return NextResponse.json(scans);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to fetch user scans:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
