import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'recent';
    const category = searchParams.get('category');
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT 
          cp.id,
          cp.title,
          cp.category,
          cp.content,
          cp.views,
          cp.comment_count,
          cp.created_at,
          u.nickname as author,
          u.is_expert,
          sh.id as scan_id,
          sh.scan_type,
          sh.result as scan_result,
          sh.risk_score as scan_risk_score,
          sh.easy_summary,
          sh.created_at as scan_date
        FROM community_posts cp
        JOIN users u ON cp.author_id = u.id
        LEFT JOIN scan_history sh ON cp.scan_result_id = sh.id
      `;

      const conditions = [];
      const params: any[] = [];

      if (category && category !== 'all') {
        conditions.push('cp.category = ?');
        params.push(category);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      if (tab === 'popular') {
        query += ' ORDER BY cp.views DESC, cp.created_at DESC';
      } else {
        query += ' ORDER BY cp.created_at DESC';
      }

      query += ' LIMIT 50';

      const [posts] = await connection.query<RowDataPacket[]>(query, params);

      const processedPosts = posts.map(post => ({
        ...post,
        is_expert: Boolean(post.is_expert)
      }));

      return NextResponse.json(processedPosts);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    return NextResponse.json(
      { error: '게시글을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title, category, content, userEmail, scanResultId } = await request.json();

    if (!title || !content || !userEmail) {
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
        connection.release();
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const userId = users[0].id;

      const [result]: any = await connection.query(
        'INSERT INTO community_posts (author_id, title, category, content, scan_result_id) VALUES (?, ?, ?, ?, ?)',
        [userId, title, category, content, scanResultId || null]
      );

      const postId = result.insertId;

      try {
        fetch('https://cslab.kku.ac.kr:8088/api/community/schedule-comment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            post_id: postId,
            title: title,
            content: content,
            scan_result_id: scanResultId || null
          })
        }).catch(err => console.error('Failed to schedule AI comment:', err));
      } catch (scheduleError) {
        console.error('Schedule request failed:', scheduleError);
      }

      return NextResponse.json({ postId, success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    return NextResponse.json(
      { error: '게시글 작성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
