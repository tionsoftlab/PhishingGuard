import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
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

      const [threads] = await connection.query<RowDataPacket[]>(
        `SELECT 
          mt.id,
          mt.user_id,
          mt.expert_id,
          mt.last_message,
          mt.unread_count,
          mt.updated_at,
          CASE 
            WHEN mt.user_id = ? THEN expert_user.nickname
            ELSE normal_user.nickname
          END as expert_name,
          CASE 
            WHEN mt.user_id = ? THEN expert_user.profile_image_url
            ELSE normal_user.profile_image_url
          END as expert_avatar,
          ep.specialty,
          CASE 
            WHEN TIMESTAMPDIFF(MINUTE, mt.updated_at, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, mt.updated_at, NOW()), '분 전')
            WHEN TIMESTAMPDIFF(HOUR, mt.updated_at, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, mt.updated_at, NOW()), '시간 전')
            WHEN TIMESTAMPDIFF(DAY, mt.updated_at, NOW()) = 1 THEN '어제'
            ELSE DATE_FORMAT(mt.updated_at, '%m/%d')
          END as time_ago
        FROM message_threads mt
        JOIN users expert_user ON mt.expert_id = expert_user.id
        JOIN users normal_user ON mt.user_id = normal_user.id
        LEFT JOIN expert_profiles ep ON mt.expert_id = ep.user_id
        WHERE (mt.user_id = ? OR mt.expert_id = ?) 
          AND (mt.last_message IS NULL OR mt.last_message NOT LIKE 'Dummy consultation%')
        ORDER BY mt.updated_at DESC`,
        [userId, userId, userId, userId]
      );

      return NextResponse.json(threads);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('메시지 스레드 조회 오류:', error);
    return NextResponse.json(
      { error: '메시지 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { expertId } = await request.json();

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

      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM message_threads WHERE user_id = ? AND expert_id = ?',
        [userId, expertId]
      );

      if (existing.length > 0) {
        return NextResponse.json({ threadId: existing[0].id });
      }

      const [result] = await connection.query(
        'INSERT INTO message_threads (user_id, expert_id, last_message, unread_count) VALUES (?, ?, ?, ?)',
        [userId, expertId, '', 0]
      );

      return NextResponse.json({ threadId: (result as any).insertId });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('메시지 스레드 생성 오류:', error);
    return NextResponse.json(
      { error: '메시지 스레드를 생성하는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
