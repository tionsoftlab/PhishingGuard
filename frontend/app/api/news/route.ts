import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    const connection = await pool.getConnection();
    
    try {
      const [news] = await connection.query<RowDataPacket[]>(`
        SELECT 
          en.id,
          en.title,
          en.summary,
          u.nickname as author,
          en.affiliation,
          DATE_FORMAT(en.created_at, '%Y.%m.%d') as date,
          en.tag,
          en.bg_color as image,
          en.views
        FROM expert_news en
        JOIN users u ON en.author_id = u.id
        WHERE u.is_expert = TRUE
        ORDER BY en.created_at DESC
        LIMIT ?
      `, [limit]);
      
      return NextResponse.json(news);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('전문가 뉴스 조회 오류:', error);
    return NextResponse.json(
      { error: '전문가 뉴스를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    if (!session.user.is_expert) {
      return NextResponse.json(
        { error: '전문가만 뉴스를 작성할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { title, summary, content, tag, bg_color, affiliation, userEmail } = await request.json();

    if (!title || !summary || !content) {
      return NextResponse.json(
        { error: '제목, 요약, 내용은 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      const [users] = await connection.query<RowDataPacket[]>(
        'SELECT id, is_expert FROM users WHERE email = ?',
        [userEmail || session.user.email]
      );

      if (users.length === 0) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (!users[0].is_expert) {
        return NextResponse.json(
          { error: '전문가만 뉴스를 작성할 수 있습니다.' },
          { status: 403 }
        );
      }

      const userId = users[0].id;

      const [result]: any = await connection.query(
        `INSERT INTO expert_news (title, summary, content, author_id, affiliation, tag, bg_color) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          summary,
          content,
          userId,
          affiliation || null,
          tag || '보안 뉴스',
          bg_color || 'bg-gradient-to-br from-blue-900 to-indigo-900'
        ]
      );

      return NextResponse.json({ newsId: result.insertId, success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('뉴스 작성 오류:', error);
    return NextResponse.json(
      { error: '뉴스 작성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
