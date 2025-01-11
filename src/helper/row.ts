import { RowDataPacket } from 'mysql2';

export interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified?: Date;
  user_type: string;
}

export interface SessionRow extends RowDataPacket {
  session_token: string;
  user_id: string;
  expires: Date;
}
