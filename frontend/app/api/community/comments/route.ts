import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { postId, content, userEmail } = await request.json();

    if (!postId || !content || !userEmail) {
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
        'INSERT INTO post_comments (post_id, author_id, content) VALUES (?, ?, ?)',
        [postId, userId, content]
      );

      await connection.query(
        'UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = ?',
        [postId]
      );

      const [posts] = await connection.query<RowDataPacket[]>(
        'SELECT cp.author_id, cp.title, u.is_bot FROM community_posts cp JOIN users u ON u.id = ? WHERE cp.id = ?',
        [userId, postId]
      );
      if (posts.length > 0 && posts[0].author_id !== userId) {
        const isBot = Boolean(posts[0].is_bot);
        const notifType = isBot ? 'ai_comment' : 'comment';
        const notifTitle = isBot
          ? 'AI가 회원님의 글에 분석 댓글을 달았습니다'
          : '회원님의 글에 새 댓글이 달렸습니다';
        const truncContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        await connection.query(
          'INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?)',
          [posts[0].author_id, notifType, notifTitle, truncContent, `/community/${postId}`]
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
    console.error('댓글 작성 오류:', error);
    return NextResponse.json(
      { error: '댓글 작성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
