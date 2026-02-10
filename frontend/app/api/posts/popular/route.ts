import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [posts] = await connection.query<RowDataPacket[]>(`
        SELECT 
          cp.id,
          cp.title,
          cp.views,
          cp.comment_count as comments,
          u.nickname as author,
          @rank := @rank + 1 as rank
        FROM community_posts cp
        JOIN users u ON cp.author_id = u.id
        CROSS JOIN (SELECT @rank := 0) r
        ORDER BY cp.views DESC
        LIMIT 10
      `);
      
      return NextResponse.json(posts);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('인기 게시글 조회 오류:', error);
    return NextResponse.json(
      { error: '인기 게시글을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
