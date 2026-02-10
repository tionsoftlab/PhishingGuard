import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

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

      const [notifications] = await connection.query<RowDataPacket[]>(
        `SELECT id, type, title, content, link, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );

      const [unreadCount] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );

      return NextResponse.json({
        notifications: notifications.map(n => ({ ...n, is_read: Boolean(n.is_read) })),
        unreadCount: unreadCount[0].count
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('알림 조회 오류:', error);
    return NextResponse.json({ error: '알림을 불러오는데 실패했습니다.' }, { status: 500 });
  }
}
