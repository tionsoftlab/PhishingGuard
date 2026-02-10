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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

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

      const [historyRows] = await connection.query<RowDataPacket[]>(
        `SELECT 
          id, scan_type, scan_target, result, risk_score, 
          threat_types, analysis_result, processing_time_ms, created_at
         FROM scan_history 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      const [countRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM scan_history WHERE user_id = ?',
        [userId]
      );

      return NextResponse.json({
        history: historyRows,
        total: countRows[0].total,
        limit,
        offset
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('스캔 히스토리 조회 오류:', error);
    return NextResponse.json(
      { error: '스캔 히스토리 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
