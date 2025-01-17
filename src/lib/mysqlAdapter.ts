import { Adapter, AdapterSession, AdapterUser } from 'next-auth/adapters';
import pool from './db';
import { ProductRow, ProductWithUserRow, SessionRow, UserRow, UserconversationRow } from '@/helper/row';
import {
  mapRowToUserconversation,
  mapToAdapterSession,
  mapToAdapterUser,
  mapToProductWithUser,
  mapToProducts,
} from '@/helper/mapper';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Message, Product } from '@/helper/type';
import { buildWhereClause } from '@/helper/buildWhereClause';

interface TotalItemRow extends RowDataPacket {
  totalItems: number;
}

const MySQLAdpater = {
  async findOrCreateConversation(senderId: string, receiverId: string): Promise<number> {
    const sqlParams = [senderId, receiverId, receiverId, senderId];
    const findSQL = `
      SELECT id FROM conversations
      WHERE (sender_id = ? AND receiver_id = ?)
      OR (sender_id = ? AND receiver_id = ?)
      LIMIT 1;
      `;
    const createSQL = `
      INSERT INTO conversations (sender_id, receiver_id) VALUES (?,?);`;

    const [[conversation]] = await pool.query<RowDataPacket[]>(findSQL, sqlParams);
    if (conversation) return conversation.id;

    const [result] = await pool.query<ResultSetHeader>(createSQL, [senderId, receiverId]);
    return result.insertId;
  },
  async createMessage(input: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message> {
    const { text, image, senderId, receiverId, conversationId } = input;
    const sql = `
      INSERT INTO messages (text, image, sender_id, receiver_id, conversation_id, created_at)
      VALUES (?,?,?,?,?,NOW());
    `;
    const sqlParams = [text || null, image || null, senderId, receiverId, conversationId];
    const [result] = await pool.query<ResultSetHeader>(sql, sqlParams);

    return {
      id: String(result.insertId),
      text: text || null,
      image: image || null,
      senderId,
      receiverId,
      conversationId: String(conversationId),
      createdAt: new Date(),
    };
  },
  async getUserwithConversations() {
    try {
      const sql = `
    SELECT
      JSON_OBJECT(
        'id',u.id,
        'name', u.name,
        'email', u.email,
        'image', u.image
      )AS user,

      IF(
        c.id IS NOT NULL,
        JSON_OBJECT(
          'id',c.id,
          'name',c.name,
          'createdAt',c.created_at
        ),
        NULL
      ) AS conversation,

      IF(
        m.id IS NOT NULL,
        JSON_OBJECT(
          'id',m.id,
          'text',m.text,
          'image',m.image,
          'createdAt',m.created_at,
          'senderId',m.sender_id,
          'receiverId',m.receiver_id
        ),
        NULL
      ) AS message

    FROM users u
    LEFT JOIN conversations c ON u.id = c.sender_id OR u.id = c.receiver_id
    LEFT JOIN messages m ON c.id = m.conversation_id;
      `;
      const [rows] = await pool.query<UserconversationRow[]>(sql);
      return rows.map(mapRowToUserconversation);
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error('Error fetching users with conversations.');
    }
  },
  async getProductWithUser(productId: string) {
    try {
      const sql = `
      SELECT
        p.id AS id,
        p.title AS title,
        p.description AS description,
        p.image_src AS image_src,
        p.category AS category,
        p.latitude AS latitude,
        p.longitude AS longitude,
        p.price AS price,
        p.user_id AS user_id,
        p.created_at AS created_at,
        p.updated_at As updated_at,
        u.id AS userId,
        u.name AS userName,
        u.email AS userEmail,
        u.image AS userImage,
        u.user_type AS userType
      FROM
        products p
      JOIN
        users u
      ON
        p.user_id = u.id
      WHERE
        p.id = ?
      `;
      const [rows] = await pool.query<ProductWithUserRow[]>(sql, [productId]);

      if (rows.length === 0) {
        return null;
      }
      return mapToProductWithUser(rows[0]);
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error('Error fetching product with user data.');
    }
  },
  async getProducts(query: Record<string, any> = {}, page: number = 1, itemsPerPage: number = 4) {
    const { where, values } = buildWhereClause(query, ['category', 'latitude', 'longitude']);

    const countSQL = `SELECT COUNT(*) as totalItems FROM products ${where}`;
    let totalItems = 0;
    try {
      const [countResult] = await pool.query<TotalItemRow[]>(countSQL, values);
      totalItems = (countResult && countResult[0]?.totalItems) || 0;
      console.log('Total Items:', totalItems);
    } catch (error) {
      console.error('Error fetching total items:', error);
      throw new Error('Error fetching total item count from the databse');
    }
    const offset = (page - 1) * itemsPerPage;

    const sql = `
      SELECT
        id,
        title,
        description,
        image_src,
        category,
        latitude,
        longitude,
        price,
        user_id,
        created_at,
        updated_at
      FROM products
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `;
    const paginatedValues = [...values, Number(itemsPerPage), Number(offset)];
    try {
      const [rows] = await pool.query<ProductRow[]>(sql, paginatedValues);
      console.log('Fetched Rows', rows);
      return { data: mapToProducts(rows), totalItems };
    } catch (error) {
      console.error('Database query error:', { query, sql, values, error });
      throw new Error('Error fetching products form the database');
    }
  },
  async createProduct({
    title,
    description,
    imageSrc,
    category,
    latitude,
    longitude,
    price,
    userId,
  }: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    if (!title || !description || !imageSrc || !category || !latitude || !longitude || !price || !userId) {
      throw new Error('All product fields are required');
    }
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `
        INSERT INTO products
        (title, description, image_src, category, latitude, longitude, price, user_id)
        VALUES(?,?,?,?,?,?,?,?)
        `,
        [title, description, imageSrc, category, latitude, longitude, price, userId]
      );
      return {
        id: result.insertId.toString(),
        title,
        description,
        imageSrc,
        category,
        latitude,
        longitude,
        price,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('An error occured while creating the product.');
    }
  },
  async getUserEmailWithPassword(email: string): Promise<UserRow | null> {
    if (!email) {
      throw new Error('Email must be provided');
    }
    try {
      const [rows] = await pool.query<UserRow[]>(
        'SELECT id, name, email, image, user_type, hashed_password FROM users WHERE email=?',
        [email]
      );
      return rows?.[0] || null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user by email');
    }
  },
  async getUser(id: string): Promise<AdapterUser | null> {
    if (!id) {
      throw new Error('ID must be provided');
    }
    try {
      const [rows] = await pool.query<UserRow[]>('SELECT id, name, email, image, user_type FROM users WHERE id = ?', [
        id,
      ]);
      return rows?.[0] ? mapToAdapterUser(rows[0]) : null;
    } catch (error) {
      console.error('Error fetchin user by ID:', error);
      throw new Error('Failed fetch user');
    }
  },
  async getUserByEmail(email: string): Promise<AdapterUser | null> {
    if (!email) {
      throw new Error('Email must be provided');
    }
    try {
      const [rows] = await pool.query<UserRow[]>(
        'SELECT id, name, email, image, user_type, favorite_ids FROM users WHERE email=?',
        [email]
      );
      return rows?.[0] ? mapToAdapterUser(rows[0]) : null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user by email');
    }
  },
  async createUser(
    user: Omit<AdapterUser, 'id' | 'image' | 'emailVerified' | 'role' | 'favoriteIds'> & { password: string }
  ): Promise<AdapterUser> {
    const { name, email, password } = user;
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (name, email, hashed_password) VALUES (?,?,?)',
      [name, email, password]
    );
    return {
      id: result.insertId.toString(),
      name,
      email,
      image: null,
      emailVerified: null,
      role: 'User',
      favoriteIds: [],
    };
  },
  async updateUser(user: Partial<AdapterUser> & { id: string }): Promise<AdapterUser> {
    const { id, name, email, image, role, favoriteIds } = user;
    const favoriteIdsJson = favoriteIds ? JSON.stringify(favoriteIds) : null;

    const updateFields = [
      { column: 'name', value: name },
      { column: 'email', value: email },
      { column: 'image', value: image },
      { column: 'user_type', value: role },
      { column: 'favorite_ids', value: favoriteIdsJson },
    ];
    const setClause = updateFields
      .map((field) => (field.value !== undefined ? `${field.column}=?` : null))
      .filter(Boolean)
      .join(', ');

    const values = updateFields.filter((field) => field.value !== undefined).map((field) => field.value);

    if (setClause) {
      try {
        await pool.query(`UPDATE users SEt ${setClause} WHERE id=?`, [...values, id]);
      } catch (error) {
        console.error('Failed to execute update query:', error);
        throw new Error('Database update failed');
      }
    }
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, name, email, image, user_type, favorite_ids FROM users WHERE id=?',
      [id]
    );
    if (rows.length === 0) {
      console.error('User not found after update:', id);
      throw new Error(`User with id ${id} not found.`);
    }
    const updatedUser = rows[0];

    return {
      id: updatedUser.id.toString(),
      name: updatedUser.name ?? null,
      email: updatedUser.emali ?? '',
      image: updatedUser.image ?? null,
      role: updatedUser.user_type ?? 'User',
      emailVerified: null,
      favoriteIds: Array.isArray(updatedUser.favorite_ids)
        ? updatedUser.favorite_ids.map((id) => id.toString()) // 숫자나 문자열로 일관성 유지
        : [],
    };
  },
  async deleteUser(id: string): Promise<void> {
    await pool.query('DELETE FROM users WHERE id=?', [id]);
  },
  async getSessionAndUser(sessionToken: string): Promise<{
    session: AdapterSession;
    user: AdapterUser;
  } | null> {
    try {
      const [results] = await pool.query<(SessionRow & UserRow)[]>(
        `SELECT
          s.session_token AS session_token,
          s.user_id AS user_id,
          s.expires AS expires,
          u.id AS id,
          u.name AS name,
          u.email AS email,
          u.image AS image,
          u.user_type AS user_type
        FROM sessions AS s
        LEFT JOIN users AS u ON s.user_id = u.id
        WHERE s.session_token=?`,
        [sessionToken]
      );
      const result = results[0];
      if (!result) return null;
      const session = mapToAdapterSession(result);
      const user = mapToAdapterUser(result);

      return { session, user };
    } catch (error) {
      console.error('Error fetching session and user:', error);
      throw new Error('Failed to fetching session and user');
    }
  },
  async createSession(session: AdapterSession): Promise<AdapterSession> {
    const { sessionToken, userId, expires } = session;
    if (!sessionToken || !userId || !expires) {
      throw new Error('All fields (sessionToken, userId, expires) are required to create a session');
    }
    try {
      await pool.query('INSERT INTO sessions (session_token, user_id, expires) VALUES (?,?,?)', [
        sessionToken,
        userId,
        expires,
      ]);

      const [rows] = await pool.query<SessionRow[]>(
        'SELECT session_token, user_id, expires FROM sessions WHERE session_token = ?',
        [sessionToken]
      );

      const result = rows[0];
      if (!result) {
        throw new Error('Failed to retrieve the created session from the database.');
      }
      return mapToAdapterSession(result);
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  },
  async updateSession(
    session: Partial<AdapterSession> & {
      sessionToken: string;
    }
  ): Promise<AdapterSession | null> {
    const { sessionToken, userId, expires } = session;
    if (!sessionToken) {
      throw new Error('Session token is required to update a session');
    }
    try {
      const updates = { user_id: userId, expires };
      const keys = Object.keys(updates).filter((key) => updates[key as keyof typeof updates] !== undefined);

      if (keys.length === 0) {
        throw new Error('No fields to update. Provide at least one fields');
      }
      const fields = keys.map((key) => `${key}=?`).join(', ');
      const values = keys.map((key) => updates[key as keyof typeof updates]);

      const query = `UPDATE sessions SET ${fields} WHERE session_tokne = ?`;
      await pool.query(query, [...values, sessionToken]);

      const [rows] = await pool.query<SessionRow[]>(
        'SELECT session_token, user_id, expires FROM sessions WHERE session_token = ?',
        [sessionToken]
      );
      if (!rows.length) {
        return null;
      }
      return mapToAdapterSession(rows[0]);
    } catch (error) {
      console.error(`Error updating session for token "${sessionToken}":`, error);
      throw new Error('Failed to update session');
    }
  },
  async deleteSession(sessionToken: string): Promise<void> {
    if (!sessionToken) {
      throw new Error('Session token is required to delete a session.');
    }
    try {
      await pool.query('DELETE FROM sessions WHERE session_token = ?', [sessionToken]);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error('Failed to delete session.');
    }
  },
};

export default MySQLAdpater;
