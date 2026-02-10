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
        'UPDATE community_posts SET views = views + 1 WHERE id = ?',
        [id]
      );

      const [posts] = await connection.query<RowDataPacket[]>(`
        SELECT 
          cp.id,
          cp.title,
          cp.content,
          cp.views,
          cp.comment_count,
          cp.created_at,
          cp.updated_at,
          u.nickname as author,
          u.is_expert,
          u.profile_image_url
        FROM community_posts cp
        JOIN users u ON cp.author_id = u.id
        WHERE cp.id = ?
      `, [id]);

      if (posts.length === 0) {
        connection.release();
        return NextResponse.json(
          { error: '게시글을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const post = {
        ...posts[0],
        is_expert: Boolean(posts[0].is_expert)
      };

      const [comments] = await connection.query<RowDataPacket[]>(`
        SELECT 
          pc.id,
          pc.content,
          pc.created_at,
          u.nickname as author,
          u.is_expert,
          u.is_bot,
          u.profile_image_url
        FROM post_comments pc
        JOIN users u ON pc.author_id = u.id
        WHERE pc.post_id = ?
        ORDER BY u.is_bot DESC, pc.created_at ASC
      `, [id]);

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
    console.error('게시글 조회 오류:', error);
    return NextResponse.json(
      { error: '게시글을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
