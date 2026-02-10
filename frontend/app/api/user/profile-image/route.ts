import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const DEMO_ACCOUNTS = ['user@example.com', 'expert@example.com'];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    if (DEMO_ACCOUNTS.includes(session.user.email)) {
      return NextResponse.json({ error: '데모 계정은 프로필 이미지를 변경할 수 없습니다.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: '이미지 파일이 필요합니다.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      const [userRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [session.user.email]
      );

      if (userRows.length === 0) {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
      }

      const userId = userRows[0].id;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `user_${userId}_${Date.now()}.${fileExtension}`;
      
      const profileDir = path.join(process.cwd(), '..', 'backend', 'static', 'profile');
      try {
        await mkdir(profileDir, { recursive: true });
      } catch (error) {
      }

      const filePath = path.join(profileDir, fileName);
      await writeFile(filePath, buffer);

      const imageUrl = `https://cslab.kku.ac.kr:8088/static/profile/${fileName}`;

      await connection.query<ResultSetHeader>(
        'UPDATE users SET profile_image_url = ? WHERE id = ?',
        [imageUrl, userId]
      );

      return NextResponse.json({
        message: '프로필 이미지가 업로드되었습니다.',
        imageUrl
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('프로필 이미지 업로드 오류:', error);
    return NextResponse.json(
      { error: '프로필 이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    if (DEMO_ACCOUNTS.includes(session.user.email)) {
      return NextResponse.json({ error: '데모 계정은 프로필 이미지를 변경할 수 없습니다.' }, { status: 403 });
    }

    const connection = await pool.getConnection();
    
    try {
      const [userRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [session.user.email]
      );

      if (userRows.length === 0) {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
      }

      const userId = userRows[0].id;

      await connection.query<ResultSetHeader>(
        'UPDATE users SET profile_image_url = NULL WHERE id = ?',
        [userId]
      );

      return NextResponse.json({
        message: '프로필 이미지가 삭제되었습니다.'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('프로필 이미지 삭제 오류:', error);
    return NextResponse.json(
      { error: '프로필 이미지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
