import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';
import { generateNickname } from '@/lib/nickname-generator';

export async function POST(request: NextRequest) {
  try {
    const { email, password, agreedToTerms } = await request.json();

    if (!agreedToTerms) {
      return NextResponse.json(
        { error: '서비스 이용 약관에 동의해야 합니다.' },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 409 }
      );
    }

    let nickname = generateNickname();
    
    let attempts = 0;
    while (attempts < 10) {
      const [nicknameCheck] = await pool.query(
        'SELECT id FROM users WHERE nickname = ?',
        [nickname]
      );
      
      if (!Array.isArray(nicknameCheck) || nicknameCheck.length === 0) {
        break;
      }
      
      nickname = `${generateNickname()}${Math.floor(Math.random() * 999)}`;
      attempts++;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, password, nickname, account_status, created_at) 
       VALUES (?, ?, ?, 'active', NOW())`,
      [email, hashedPassword, nickname]
    );

    const userId = result.insertId;

    // TOS 동의 기록 저장
    const ip = request.headers.get('x-forwarded-for') || (request as any).ip || null;
    
    await pool.query(
      `INSERT INTO tos_consent (user_id, consent_type, ip_address) 
       VALUES (?, 'privacy_and_tos', ?)`,
      [userId, ip]
    );

    return NextResponse.json(
      {
        message: '회원가입이 완료되었습니다.',
        userId: userId,
        nickname: nickname
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('회원가입 오류:', error);
    console.error('에러 상세:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql
    });
    return NextResponse.json(
      { 
        error: '회원가입 처리 중 오류가 발생했습니다.',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
