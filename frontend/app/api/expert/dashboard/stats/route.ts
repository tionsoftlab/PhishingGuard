import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const userEmail = searchParams.get('user_email') || session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: '사용자 이메일이 필요합니다.' }, { status: 400 });
    }

    const connection = await pool.getConnection();

    try {
      const [expertRows] = await connection.query<RowDataPacket[]>(
        `SELECT ep.*, u.id as user_id 
         FROM expert_profiles ep 
         JOIN users u ON ep.user_id = u.id 
         WHERE u.email = ?`,
        [userEmail]
      );

      if (expertRows.length === 0) {
        return NextResponse.json({ error: '전문가 프로필을 찾을 수 없습니다.' }, { status: 404 });
      }

      const expertProfile = expertRows[0];
      const userId = expertProfile.user_id;

      const [monthlyRows] = await connection.query<RowDataPacket[]>(
        `SELECT 
           DATE_FORMAT(created_at, '%Y-%m') as month, 
           COUNT(*) as count 
         FROM message_threads 
         WHERE expert_id = ? 
           AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY month
         ORDER BY month ASC`,
        [userId]
      );
      
      const monthlyStats = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const found = monthlyRows.find((row : any) => row.month === monthStr);
        monthlyStats.push({
          month: `${d.getMonth() + 1}월`,
          count: found ? Number(found.count) : 0
        });
      }


      return NextResponse.json({
        total_consultations: expertProfile.consultation_count || 0,
        average_rating: expertProfile.rating ? Number(expertProfile.rating) : 0.0,
        monthly_stats: monthlyStats
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Expert dashboard stats error:', error);
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
