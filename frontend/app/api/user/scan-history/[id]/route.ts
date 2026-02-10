import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    const { id } = await params;
    const scanId = id;

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
      
      console.log(`[ScanHistory] Requesting ID: ${scanId} for User: ${userId} (${session.user.email})`);

      const [historyRows] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM scan_history WHERE id = ? AND user_id = ?`,
        [scanId, userId]
      );

      if (historyRows.length === 0) {
        console.error(`[ScanHistory] Not Found - ID: ${scanId}, User: ${userId}`);
        return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
      }

      return NextResponse.json(historyRows[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('스캔 히스토리 상세 조회 오류:', error);
    return NextResponse.json(
      { error: '스캔 히스토리 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
