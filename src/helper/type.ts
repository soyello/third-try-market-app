import { AdapterUser } from 'next-auth/adapters';

export interface Product {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  category: string;
  latitude: number;
  longitude: number;
  price: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

type Serialized<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

export type SerializedProduct = Serialized<Product>;

export type TUser = AdapterUser & {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type TConversation = {
  id: string;
  participantIds: string[];
  messageIds: string[];
  createdAt: Date;
  updatedAt?: Date;
};

export type Message = {
  id: string;
  text: string | null;
  image: string | null;
  senderId: string;
  receiverId: string;
  conversationId: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type TUserWithChat = TUser & {
  conversations: TConversation[];
};
