import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

const DEMO_ACCOUNTS = ['user@example.com', 'expert@example.com'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '게시글 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      const [posts] = await connection.query<RowDataPacket[]>(
        `
        SELECT 
          cp.id,
          cp.title,
          cp.category,
          cp.content,
          cp.views,
          cp.comment_count,
          cp.created_at,
          cp.updated_at,
          u.nickname as author,
          u.is_expert,
          sh.id as scan_id,
          sh.scan_type,
          sh.scan_target,
          sh.result as scan_result,
          sh.risk_score as scan_risk_score,
          sh.easy_summary,
          sh.created_at as scan_date
        FROM community_posts cp
        JOIN users u ON cp.author_id = u.id
        LEFT JOIN scan_history sh ON cp.scan_result_id = sh.id
        WHERE cp.id = ?
        `,
        [id]
      );

      if (posts.length === 0) {
        return NextResponse.json(
          { error: '게시글을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const post = posts[0];
      post.is_expert = Boolean(post.is_expert);

      await connection.query(
        'UPDATE community_posts SET views = views + 1 WHERE id = ?',
        [id]
      );

      const [comments] = await connection.query<RowDataPacket[]>(
        `
        SELECT 
          pc.id,
          pc.content,
          pc.created_at,
          u.nickname as author,
          u.email as author_email,
          u.is_expert,
          u.is_bot
        FROM post_comments pc
        JOIN users u ON pc.author_id = u.id
        WHERE pc.post_id = ?
        ORDER BY pc.created_at ASC
        `,
        [id]
      );

      const processedComments = comments.map(comment => ({
        ...comment,
        is_expert: Boolean(comment.is_expert),
        is_bot: Boolean(comment.is_bot)
      }));

      return NextResponse.json({
        ...post,
        comments: processedComments
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    return NextResponse.json(
      { error: '게시글을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, category, content, userEmail, scanResultId } = await request.json();

    if (!id || !title || !content || !userEmail) {
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

      const [posts] = await connection.query<RowDataPacket[]>(
        'SELECT author_id FROM community_posts WHERE id = ?',
        [id]
      );

      if (posts.length === 0) {
        return NextResponse.json(
          { error: '게시글을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (posts[0].author_id !== userId) {
        return NextResponse.json(
          { error: '수정 권한이 없습니다.' },
          { status: 403 }
        );
      }

      await connection.query(
        'UPDATE community_posts SET title = ?, category = ?, content = ?, scan_result_id = ? WHERE id = ?',
        [title, category, content, scanResultId || null, id]
      );

      return NextResponse.json({ success: true });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    return NextResponse.json(
      { error: '게시글 수정에 실패했습니다.' },
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
    const { userEmail } = await request.json();

    if (!id || !userEmail) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (DEMO_ACCOUNTS.includes(userEmail)) {
      return NextResponse.json(
        { error: '데모 계정의 게시글은 삭제할 수 없습니다.' },
        { status: 403 }
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

      const [posts] = await connection.query<RowDataPacket[]>(
        'SELECT author_id FROM community_posts WHERE id = ?',
        [id]
      );

      if (posts.length === 0) {
        return NextResponse.json(
          { error: '게시글을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (posts[0].author_id !== userId) {
        return NextResponse.json(
          { error: '삭제 권한이 없습니다.' },
          { status: 403 }
        );
      }

      await connection.query('DELETE FROM post_comments WHERE post_id = ?', [id]);
      await connection.query('DELETE FROM community_posts WHERE id = ?', [id]);

      return NextResponse.json({ success: true });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    return NextResponse.json(
      { error: '게시글 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
