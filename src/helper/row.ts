import { RowDataPacket } from 'mysql2';

export interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified?: Date;
  user_type: string;
  hashed_password?: string;
  favorite_ids: string[];
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

export interface ProductUserRow extends RowDataPacket {
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  userType: string;
}

export type ProductWithUserRow = ProductRow & ProductUserRow;

export interface UserconversationRow extends RowDataPacket {
  user: Pick<UserRow, 'id' | 'name' | 'email' | 'image'>;
  conversation: {
    id: string | null;
    name: string | null;
    createdAt: string | null;
  } | null;
  message: {
    id: string | null;
    text: string | null;
    image: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    senderId: string | null;
    receiverId: string | null;
  };
}

export interface Message extends RowDataPacket {
  messageId: string;
  text: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  senderId: string | null;
  receiverId: string | null;
  conversationId: string;
}

export interface Conversation extends RowDataPacket {
  conversationId: string;
  createdAt: Date;
  updatedAt: Date;
  messageIds: string[];
  userIds: string[];
}
