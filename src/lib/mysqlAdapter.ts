import { Adapter, AdapterSession, AdapterUser } from 'next-auth/adapters';
import pool from './db';
import { ProductRow, SessionRow, UserRow } from '@/helper/row';
import { mapToAdapterSession, mapToAdapterUser, mapToProducts } from '@/helper/mapper';
import { ResultSetHeader } from 'mysql2';
import { Product } from '@/helper/type';
import { buildWhereClause } from '@/helper/buildWhereClause';

const MySQLAdpater = {
  async getProducts(query: Record<string, any> = {}): Promise<Product[]> {
    const { where, values } = buildWhereClause(query, ['category', 'latitude', 'longitude']);
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
      ORDER BY created_at DESC`;
    try {
      const [rows] = await pool.query<ProductRow[]>(sql, values);
      return mapToProducts(rows);
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
