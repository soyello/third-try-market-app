import { RowDataPacket } from 'mysql2';

export interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified?: Date;
  user_type: string;
  hashed_password?: string;
}

export interface SessionRow extends RowDataPacket {
  session_token: string;
  user_id: string;
  expires: Date;
}

export interface ProductRow extends RowDataPacket {
  id: string;
  title: string;
  description: string;
  image_src: string;
  category: string;
  latitude: number;
  longitude: number;
  price: number;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}
