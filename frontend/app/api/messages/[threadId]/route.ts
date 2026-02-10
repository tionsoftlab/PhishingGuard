import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(
  request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const params = await context.params;
    const threadId = params.threadId;

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
        'SELECT id, user_id, expert_id FROM message_threads WHERE id = ? AND (user_id = ? OR expert_id = ?)',
        [threadId, userId, userId]
      );

      if (threads.length === 0) {
        return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
      }

      const threadUserId = threads[0].user_id;
      const expertId = threads[0].expert_id;
      const otherUserId = userId === threadUserId ? expertId : threadUserId;

      const [messages] = await connection.query<RowDataPacket[]>(
        `SELECT 
          m.id,
          m.message_text,
          m.sender_id,
          m.created_at,
          m.is_read,
          m.file_url,
          m.file_name,
          m.file_size,
          m.file_type,
          CASE 
            WHEN DATE(m.created_at) = CURDATE() THEN DATE_FORMAT(m.created_at, '%p %l:%i')
            WHEN DATE(m.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN CONCAT('어제 ', DATE_FORMAT(m.created_at, '%p %l:%i'))
            ELSE DATE_FORMAT(m.created_at, '%m/%d %p %l:%i')
          END as time_formatted,
          CASE WHEN m.sender_id = ? THEN 'me' ELSE 'other' END as sender_type
        FROM messages m
        WHERE m.thread_id = ?
        ORDER BY m.created_at ASC`,
        [userId, threadId]
      );

      await connection.query(
        'UPDATE messages SET is_read = TRUE WHERE thread_id = ? AND sender_id = ? AND is_read = FALSE',
        [threadId, otherUserId]
      );

      await connection.query(
        'UPDATE message_threads SET unread_count = 0 WHERE id = ?',
        [threadId]
      );

      return NextResponse.json(messages);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    return NextResponse.json(
      { error: '메시지를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const params = await context.params;
    const threadId = params.threadId;
    const { message, fileUrl, fileName, fileSize, fileType } = await request.json();

    if ((!message || message.trim().length === 0) && !fileUrl) {
      return NextResponse.json({ error: '메시지 또는 파일을 입력해주세요.' }, { status: 400 });
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
        'SELECT id FROM message_threads WHERE id = ? AND (user_id = ? OR expert_id = ?)',
        [threadId, userId, userId]
      );

      if (threads.length === 0) {
        return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
      }

      const [result] = await connection.query(
        `INSERT INTO messages (thread_id, sender_id, message_text, is_read, file_url, file_name, file_size, file_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [threadId, userId, message?.trim() || '', false, fileUrl || null, fileName || null, fileSize || null, fileType || null]
      );

      await connection.query(
        'UPDATE message_threads SET last_message = ?, updated_at = NOW() WHERE id = ?',
        [message.trim(), threadId]
      );

      const [threadInfo] = await connection.query<RowDataPacket[]>(
        'SELECT user_id, expert_id FROM message_threads WHERE id = ?',
        [threadId]
      );
      if (threadInfo.length > 0) {
        const recipientId = userId === threadInfo[0].user_id ? threadInfo[0].expert_id : threadInfo[0].user_id;
        const [senderInfo] = await connection.query<RowDataPacket[]>(
          'SELECT nickname FROM users WHERE id = ?',
          [userId]
        );
        const senderName = senderInfo.length > 0 ? senderInfo[0].nickname : '알 수 없음';
        const truncMsg = message.trim().length > 100 ? message.trim().substring(0, 100) + '...' : message.trim();
        await connection.query(
          'INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?)',
          [recipientId, 'message', `${senderName}님이 메시지를 보냈습니다`, truncMsg, '/messages']
        );
      }

      const messageId = (result as any).insertId;

      const [newMessages] = await connection.query<RowDataPacket[]>(
        `SELECT 
          m.id,
          m.message_text,
          m.sender_id,
          m.created_at,
          CASE 
            WHEN DATE(m.created_at) = CURDATE() THEN DATE_FORMAT(m.created_at, '%p %l:%i')
            WHEN DATE(m.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN CONCAT('어제 ', DATE_FORMAT(m.created_at, '%p %l:%i'))
            ELSE DATE_FORMAT(m.created_at, '%m/%d %p %l:%i')
          END as time_formatted,
          'me' as sender_type
        FROM messages m
        WHERE m.id = ?`,
        [messageId]
      );

      return NextResponse.json(newMessages[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    return NextResponse.json(
      { error: '메시지 전송에 실패했습니다.' },
      { status: 500 }
    );
  }
}
