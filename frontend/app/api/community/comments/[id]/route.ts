import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content, userEmail } = await request.json();

    if (!id || !content || !userEmail) {
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

      const [comments] = await connection.query<RowDataPacket[]>(
        'SELECT author_id FROM post_comments WHERE id = ?',
        [id]
      );

      if (comments.length === 0) {
        return NextResponse.json(
          { error: '댓글을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (comments[0].author_id !== userId) {
        return NextResponse.json(
          { error: '수정 권한이 없습니다.' },
          { status: 403 }
        );
      }

      await connection.query(
        'UPDATE post_comments SET content = ? WHERE id = ?',
        [content, id]
      );

      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('댓글 수정 오류:', error);
    return NextResponse.json(
      { error: '댓글 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userEmail, postId } = await request.json();

    if (!id || !userEmail) {
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

      const [comments] = await connection.query<RowDataPacket[]>(
        'SELECT author_id, post_id FROM post_comments WHERE id = ?',
        [id]
      );

      if (comments.length === 0) {
        return NextResponse.json(
          { error: '댓글을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (comments[0].author_id !== userId) {
        return NextResponse.json(
          { error: '삭제 권한이 없습니다.' },
          { status: 403 }
        );
      }

      const commentPostId = comments[0].post_id;

      await connection.query('DELETE FROM post_comments WHERE id = ?', [id]);

      await connection.query(
        'UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?',
        [commentPostId]
      );

      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json(
      { error: '댓글 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
