import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { newsId, content, userEmail } = await request.json();

    if (!newsId || !content || !userEmail) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      const [users] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [userEmail]
      );

      if (users.length === 0) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const userId = users[0].id;

      const [result]: any = await connection.query(
        'INSERT INTO expert_news_comments (news_id, author_id, content) VALUES (?, ?, ?)',
        [newsId, userId, content]
      );

      const [newsRows] = await connection.query<RowDataPacket[]>(
        'SELECT author_id, title FROM expert_news WHERE id = ?',
        [newsId]
      );
      if (newsRows.length > 0 && newsRows[0].author_id !== userId) {
        const truncContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        await connection.query(
          'INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?)',
          [newsRows[0].author_id, 'news_comment', '회원님의 뉴스에 새 댓글이 달렸습니다', truncContent, `/experts/${newsId}`]
        );
      }

      return NextResponse.json({
        success: true,
        commentId: result.insertId
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('뉴스 댓글 작성 오류:', error);
    return NextResponse.json(
      { error: '댓글 작성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
