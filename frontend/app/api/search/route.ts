import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json(
        { error: '검색어를 입력해주세요.' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      const searchPattern = `%${query}%`;

      const [results] = await connection.query<RowDataPacket[]>(`
        SELECT 
          'post' as type,
          cp.id,
          cp.title,
          cp.content,
          u.nickname as author,
          u.id as author_id,
          u.profile_image_url,
          cp.views,
          cp.comment_count as likes,
          cp.created_at,
          NULL as scan_type
        FROM community_posts cp
        JOIN users u ON cp.author_id = u.id
        WHERE cp.title LIKE ? 
           OR cp.content LIKE ? 
           OR u.nickname LIKE ?
        ORDER BY cp.created_at DESC
        LIMIT 50
      `, [searchPattern, searchPattern, searchPattern]);

      return NextResponse.json({
        results: results.map(result => ({
          ...result,
          content: result.content.substring(0, 200)
        }))
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('검색 오류:', error);
    return NextResponse.json(
      { error: '검색을 수행할 수 없습니다.' },
      { status: 500 }
    );
  }
}
