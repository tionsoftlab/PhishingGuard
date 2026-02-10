import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, nickname, email, is_expert, expert_verified_at, expert_field, 
              career_info, email_verified, account_status, profile_image_url, 
              created_at, last_login_at, updated_at
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

const DEMO_ACCOUNTS = ['user@example.com', 'expert@example.com'];

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const { nickname, profile_image_url, expert_field, career_info } = await request.json();

    if (DEMO_ACCOUNTS.includes((session.user as any).email || '')) {
      if (nickname || profile_image_url !== undefined) {
        return NextResponse.json(
          { error: '데모 계정은 닉네임 및 프로필 이미지를 변경할 수 없습니다.' },
          { status: 403 }
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (nickname) {
      updates.push('nickname = ?');
      values.push(nickname);
    }

    if (profile_image_url !== undefined) {
      updates.push('profile_image_url = ?');
      values.push(profile_image_url);
    }

    if (expert_field !== undefined) {
      updates.push('expert_field = ?');
      values.push(expert_field);
    }

    if (career_info !== undefined) {
      updates.push('career_info = ?');
      values.push(career_info);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: '수정할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    values.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return NextResponse.json({ message: '프로필이 수정되었습니다.' });
  } catch (error) {
    console.error('프로필 수정 오류:', error);
    return NextResponse.json(
      { error: '프로필 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
