import { RowDataPacket } from 'mysql2';
import { NextAuthOptions, User } from 'next-auth';
import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import pool from '../../../lib/db';

declare module 'next-auth' {
  interface User {
    id: string;
  }
  interface Session {
    user: User;
  }
  interface JWT {
    id: string;
  }
}

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
        const hardcodedUser = {
          id: '정재연 천재',
          name: '부자된다 일확천금',
          email: 'hello@love.com',
          hashedPassword: '12345',
        };
        if (!credentials) return null;
        if (credentials.email === hardcodedUser.email && credentials.password === hardcodedUser.hashedPassword) {
          return hardcodedUser as User;
        }

        const [rows] = await pool.query<UserRow[]>(
          'SELECT id, name, email, hashedPassword FROM users WHERE email = ?',
          [credentials.email]
        );

        const user = rows[0];

        if (user && user.hashedPassword) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
          };
        } else {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...(session.user || {}),
          id: token.id as string,
        };
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
