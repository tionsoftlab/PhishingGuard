import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connection = await pool.getConnection();
    
    try {
      await connection.query(
        'UPDATE expert_news SET views = views + 1 WHERE id = ?',
        [id]
      );

      const [news] = await connection.query<RowDataPacket[]>(`
        SELECT 
          en.id,
          en.title,
          en.summary,
          en.content,
          en.views,
          en.created_at,
          en.updated_at,
          en.tag,
          en.bg_color,
          en.affiliation,
          en.author_id,
          u.nickname as author,
          u.email as author_email,
          u.is_expert,
          u.profile_image_url
        FROM expert_news en
        JOIN users u ON en.author_id = u.id
        WHERE en.id = ?
      `, [id]);

      if (news.length === 0) {
        connection.release();
        return NextResponse.json(
          { error: '뉴스를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const [comments] = await connection.query<RowDataPacket[]>(`
        SELECT 
          c.id,
          c.content,
          c.created_at,
          u.nickname as author,
          u.email as author_email,
          u.is_expert,
          u.profile_image_url
        FROM expert_news_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.news_id = ?
        ORDER BY c.created_at ASC
      `, [id]);

      const processedComments = comments.map(comment => ({
        ...comment,
        is_expert: Boolean(comment.is_expert)
      }));

      const newsItem = {
        ...news[0],
        is_expert: Boolean(news[0].is_expert),
        comments: processedComments,
        comment_count: processedComments.length
      };

      return NextResponse.json(newsItem);

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('뉴스 조회 오류:', error);
    return NextResponse.json(
      { error: '뉴스를 불러오는데 실패했습니다.' },
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
    const { title, summary, content, tag, bg_color, affiliation, userEmail } = await request.json();

    if (!id || !title || !summary || !content || !userEmail) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      const [users] = await connection.query<RowDataPacket[]>(
        'SELECT id, is_expert FROM users WHERE email = ?',
        [userEmail]
      );

      if (users.length === 0) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (!users[0].is_expert) {
        return NextResponse.json(
          { error: '전문가만 뉴스를 수정할 수 있습니다.' },
          { status: 403 }
        );
      }

      const userId = users[0].id;

      const [news] = await connection.query<RowDataPacket[]>(
        'SELECT author_id FROM expert_news WHERE id = ?',
        [id]
      );

      if (news.length === 0) {
        return NextResponse.json(
          { error: '뉴스를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (news[0].author_id !== userId) {
        return NextResponse.json(
          { error: '수정 권한이 없습니다.' },
          { status: 403 }
        );
      }

      await connection.query(
        `UPDATE expert_news SET title = ?, summary = ?, content = ?, tag = ?, bg_color = ?, affiliation = ? WHERE id = ?`,
        [title, summary, content, tag || '보안 뉴스', bg_color || 'bg-gradient-to-br from-blue-900 to-indigo-900', affiliation || null, id]
      );

      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('뉴스 수정 오류:', error);
    return NextResponse.json(
      { error: '뉴스 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}
