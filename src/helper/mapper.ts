import { AdapterSession, AdapterUser } from 'next-auth/adapters';
import { SessionRow, UserRow } from './row';

export const mapToAdapterUser = (row: UserRow): AdapterUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  image: row.image ?? null,
  emailVerified: row.emailVerified ?? null,
  role: row.user_type,
});

export const mapToAdapterSession = (row: SessionRow): AdapterSession => ({
  sessionToken: row.session_token,
  userId: row.user_id,
  expires: row.expires,
});
