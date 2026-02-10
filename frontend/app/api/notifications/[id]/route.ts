import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;
    const connection = await pool.getConnection();

    try {
      const [users] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [session.user.email]
      );

      if (users.length === 0) {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
      }

      const userId = users[0].id;

      if (id === 'all') {
        await connection.query(
          'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
          [userId]
        );
      } else {
        await connection.query(
          'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
          [id, userId]
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    return NextResponse.json({ error: '알림 처리에 실패했습니다.' }, { status: 500 });
  }
}
