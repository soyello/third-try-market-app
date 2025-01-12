import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getServerSession } from 'next-auth';
import MySQLAdpater from './mysqlAdapter';

export default async function getCurrentUser(req: any, res: any) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      throw new Error('Unauthorized');
    }
    const currentUser = await MySQLAdpater.getUserByEmail(session.user.email);

    if (!currentUser) {
      return null;
    }
    return currentUser;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}
