import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import pool from './db';
import { RowDataPacket } from 'mysql2';

interface User {
  id: number;
  email: string;
  nickname: string;
  is_expert: boolean;
  profile_image_url?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM users WHERE email = ? AND account_status = "active"',
            [credentials.email]
          );

          if (rows.length === 0) {
            return null;
          }

          const user = rows[0];
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          await pool.query(
            'UPDATE users SET last_login_at = NOW() WHERE id = ?',
            [user.id]
          );

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.nickname,
            image: user.profile_image_url,
            is_expert: user.is_expert
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.is_expert = (user as any).is_expert;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).is_expert = token.is_expert;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET
};
