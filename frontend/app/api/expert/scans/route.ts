import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [userRows] = await pool.query<RowDataPacket[]>(
      'SELECT is_expert FROM users WHERE email = ?',
      [session.user.email]
    );

    if (userRows.length === 0 || !userRows[0].is_expert) {
        return NextResponse.json(
            { error: 'Forbidden: Expert access only' },
            { status: 403 }
        );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [scanRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id, scan_type, scan_target, result, risk_score, 
        threat_types, analysis_result, easy_summary, expert_summary, 
        processing_time_ms, user_agent, created_at
       FROM scan_history
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return NextResponse.json(scanRows);

  } catch (error) {
    console.error('Error fetching expert scans:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
