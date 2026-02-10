import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';

const DEMO_ACCOUNTS = ['user@example.com', 'expert@example.com'];

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    if (DEMO_ACCOUNTS.includes(session.user.email)) {
      return NextResponse.json(
        { error: '데모 계정은 비밀번호를 변경할 수 없습니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: '새 비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      const [userRows] = await connection.query<RowDataPacket[]>(
        'SELECT id, password FROM users WHERE email = ?',
        [session.user.email]
      );

      if (userRows.length === 0) {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
      }

      const user = userRows[0];

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: '현재 비밀번호가 일치하지 않습니다.' },
          { status: 401 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await connection.query<ResultSetHeader>(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, user.id]
      );

      return NextResponse.json({
        message: '비밀번호가 성공적으로 변경되었습니다.'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    return NextResponse.json(
      { error: '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
