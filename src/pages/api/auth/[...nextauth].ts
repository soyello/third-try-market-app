import { RowDataPacket } from 'mysql2';
import { NextAuthOptions, User } from 'next-auth';
import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import pool from '../../../lib/db';
import MySQLAdpater from '@/lib/mysqlAdapter';
import bcrypt from 'bcryptjs';

interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  hashedPassword?: string;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'ID를 입력하세요' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await MySQLAdpater.getUserEmailWithPassword(credentials.email);

        if (user === null) {
          console.log('회원가입이력이 없습니다.');
        }

        const isCorrectPassword = await bcrypt.compare(credentials.password, user?.hashed_password!);

        if (!isCorrectPassword) {
          throw new Error('Invalid credentials');
        }

        if (user && isCorrectPassword) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.user_type,
          };
        }
        return null;
      },
    }),
  ],
  jwt: {
    secret: process.env.JWT_SECRET,
    maxAge: 30 * 24 * 60 * 60,
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      console.log('token', token);
      console.log('user', user);
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('@', session, token);
      if (token) {
        session.user = {
          ...(session.user || {}),
          id: token.id as string,
          role: token.role as string,
        };
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
