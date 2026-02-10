import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

const DEMO_ACCOUNTS = ['user@example.com', 'expert@example.com'];

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    if (DEMO_ACCOUNTS.includes(session.user.email || '')) {
      return NextResponse.json(
        { error: '데모 계정은 탈퇴할 수 없습니다.' },
        { status: 403 }
      );
    }

    const userId = (session.user as any).id;

    await pool.query<ResultSetHeader>(
      `UPDATE users 
       SET account_status = 'withdrawn', 
           withdrawn_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [userId]
    );

    return NextResponse.json(
      { 
        message: '회원 탈퇴가 완료되었습니다.',
        redirectUrl: '/auth/signin'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('회원 탈퇴 오류:', error);
    return NextResponse.json(
      { 
        error: '회원 탈퇴 처리 중 오류가 발생했습니다.',
        details: error.message
      },
      { status: 500 }
    );
  }
}
