import { Adapter, AdapterUser } from 'next-auth/adapters';
import pool from './db';
import { UserRow } from '@/helper/row';
import { mapToAdapterUser } from '@/helper/mapper';
import { ResultSetHeader } from 'mysql2';

const MySQLAdpater = {
  async getUser(id: string): Promise<AdapterUser | null> {
    if (!id) {
      throw new Error('ID must be provided');
    }
    try {
      const [rows] = await pool.query<UserRow[]>('SELECT id, name, email, image FROM users WHERE id = ?', [id]);
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
      const [rows] = await pool.query<UserRow[]>('SELECT id, name, email, image FROM users WHERe email=?', [email]);
      return rows?.[0] ? mapToAdapterUser(rows[0]) : null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user by email');
    }
  },
  async createUser(user: Omit<AdapterUser, 'id' | 'emailVerified'>): Promise<AdapterUser> {
    const { name, email, image } = user;
    const [result] = await pool.query<ResultSetHeader>('INSERT INTO users (name, email, image) VALUES (?,?,?)', [
      name,
      email,
      image,
    ]);
    return { id: result.insertId.toString(), name, email, image, emailVerified: null };
  },
  async updateUser(user: Partial<AdapterUser> & { id: string }): Promise<AdapterUser> {
    const { id, name, email, image } = user;
    if (!id) {
      throw new Error('User Id is required for updating.');
    }
    try {
      const updates = { name, email, image };
      const keys = Object.keys(updates).filter((key) => updates[key as keyof typeof updates] !== undefined);
      if (keys.length === 0) {
        throw new Error('No fields to update. Provide at laest one filed');
      }
      const fields = keys.map((key) => `${key}=?`).join(', ');
      const values = keys.map((key) => updates[key as keyof typeof updates]);

      await pool.query(`UPDATE users SET ${fields} WHERE id=?`, [...values, id]);

      const [rows] = await pool.query<UserRow[]>('SELECT id, name, email, image FROM users WHERE id=?', [id]);

      if (!rows[0]) {
        throw new Error(`User with ID: ${id} not found after update.`);
      }
      return mapToAdapterUser(rows[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user.');
    }
  },
  async deleteUser(id: string): Promise<void> {
    await pool.query('DELETE FROM users WHERE id=?', [id]);
  },
};
