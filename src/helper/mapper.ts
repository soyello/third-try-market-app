import { AdapterSession, AdapterUser } from 'next-auth/adapters';
import { ProductRow, ProductWithUserRow, SessionRow, UserRow, UserconversationRow } from './row';
import { Product } from './type';

export const mapToAdapterUser = (row: UserRow): AdapterUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  image: row.image ?? null,
  emailVerified: row.emailVerified ?? null,
  role: row.user_type,
  favoriteIds: row.favorite_ids,
});

export const mapToAdapterSession = (row: SessionRow): AdapterSession => ({
  sessionToken: row.session_token,
  userId: row.user_id,
  expires: row.expires,
});

export const mapToProduct = (row: ProductRow): Product => {
  return {
    id: row.id.toString(),
    title: row.title,
    description: row.description,
    imageSrc: row.image_src,
    category: row.category,
    latitude: row.latitude,
    longitude: row.longitude,
    price: row.price,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

export const mapToProducts = (rows: ProductRow[]): Product[] => {
  return rows.map(mapToProduct);
};

export const mapToProductWithUser = (row: ProductWithUserRow) => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageSrc: row.image_src,
    category: row.category,
    latitude: row.latitude,
    longitude: row.longitude,
    price: row.price,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    user: {
      id: row.userId,
      name: row.userName ?? null,
      email: row.userEmail,
      image: row.userImage ?? null,
      role: row.userType,
    },
  };
};

export const mapRowToUserconversation = (row: UserconversationRow) => {
  return {
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    image: row.user.image,
    conversation: row.conversation
      ? {
          id: row.conversation.id,
          name: row.conversation.name,
          createdAt: row.conversation.createdAt,
        }
      : null,
    message: row.message
      ? {
          id: row.message.id,
          text: row.message.text,
          image: row.message.image,
          createdAt: row.message.createdAt,
          updatedAt: row.message.updatedAt,
          senderId: row.message.senderId,
          receiverId: row.message.receiverId,
        }
      : null,
  };
};
