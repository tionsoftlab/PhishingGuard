import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
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

      const [settingsRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM user_settings WHERE user_id = ?',
        [userId]
      );

      if (settingsRows.length === 0) {
        await connection.query(
          'INSERT INTO user_settings (user_id) VALUES (?)',
          [userId]
        );
        
        const [newSettingsRows] = await connection.query<RowDataPacket[]>(
          'SELECT * FROM user_settings WHERE user_id = ?',
          [userId]
        );
        
        return NextResponse.json(newSettingsRows[0]);
      }

      return NextResponse.json(settingsRows[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('설정 조회 오류:', error);
    return NextResponse.json(
      { error: '설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { theme, sound_effects, auto_scan } = body;

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

      const updates: string[] = [];
      const values: any[] = [];

      if (theme !== undefined) {
        updates.push('theme = ?');
        values.push(theme);
      }
      if (sound_effects !== undefined) {
        updates.push('sound_effects = ?');
        values.push(sound_effects);
      }
      if (auto_scan !== undefined) {
        updates.push('auto_scan = ?');
        values.push(auto_scan);
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: '업데이트할 항목이 없습니다.' }, { status: 400 });
      }

      values.push(userId);

      await connection.query(
        `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );

      const [updatedSettings] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM user_settings WHERE user_id = ?',
        [userId]
      );

      return NextResponse.json({
        message: '설정이 업데이트되었습니다.',
        settings: updatedSettings[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('설정 업데이트 오류:', error);
    return NextResponse.json(
      { error: '설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
