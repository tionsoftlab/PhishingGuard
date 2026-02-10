import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT 
          ep.id,
          ep.specialty,
          ep.experience_years,
          ep.certifications,
          ep.introduction,
          ep.consultation_count,
          ep.rating,
          ep.is_featured,
          u.nickname,
          u.profile_image_url
        FROM expert_profiles ep
        JOIN users u ON ep.user_id = u.id
        WHERE u.account_status = 'active'
      `;

      if (featured === 'true') {
        query += ' AND ep.is_featured = 1';
      }

      query += ' ORDER BY ep.rating DESC, ep.consultation_count DESC';

      if (featured === 'true') {
        query += ' LIMIT 3';
      }

      const [experts] = await connection.query<RowDataPacket[]>(query);

      const processedExperts = experts.map(expert => ({
        ...expert,
        experience_years: Number(expert.experience_years),
        consultation_count: Number(expert.consultation_count),
        rating: Number(expert.rating),
        is_featured: Boolean(expert.is_featured)
      }));

      return NextResponse.json(processedExperts);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('전문가 조회 오류:', error);
    return NextResponse.json(
      { error: '전문가 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
