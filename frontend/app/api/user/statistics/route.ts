import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const connection = await pool.getConnection();
    
    try {
      const [userRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [session.user.email]
      );

      if (userRows.length === 0) {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
      }

      const userId = userRows[0].id;

      const [statsRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM user_statistics WHERE user_id = ?',
        [userId]
      );

      if (statsRows.length === 0) {
        await connection.query(
          'INSERT INTO user_statistics (user_id) VALUES (?)',
          [userId]
        );
        
        const [newStatsRows] = await connection.query<RowDataPacket[]>(
          'SELECT * FROM user_statistics WHERE user_id = ?',
          [userId]
        );
        
        return NextResponse.json(newStatsRows[0]);
      }

      return NextResponse.json(statsRows[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('통계 조회 오류:', error);
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
