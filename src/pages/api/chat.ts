import getCurrentUser from '@/lib/getCurrentUser';
import MySQLAdpater from '@/lib/mysqlAdapter';
import { NextApiRequest, NextApiResponse } from 'next';

async function validateCurrentUser(req: NextApiRequest, res: NextApiResponse) {
  const currentUser = await getCurrentUser(req, res);
  if (!currentUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return currentUser;
}

function validateRequestBody(body: any, requiredFields: string[]) {
  const missingFields = requiredFields.filter((field) => !body[field]);
  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')}`;
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, body } = req;

  // GET: Fetch users with conversations
  if (method === 'GET') {
    const currentUser = await validateCurrentUser(req, res);
    if (!currentUser) return;

    try {
      const usersWithConversations = await MySQLAdpater.getUserwithConversations();
      if (usersWithConversations.length === 0) {
        return res.status(404).json({ error: 'No conversations found' });
      }
      return res.status(200).json(usersWithConversations);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Database query failed:', error);
        return res.status(500).json({ error: 'Failed to fetch data', details: error.message });
      }
    }
  }

  // POST: Create a message
  if (method === 'POST') {
    const currentUser = await validateCurrentUser(req, res);
    if (!currentUser) return;

    const validationError = validateRequestBody(body, ['senderId', 'receiverId', 'text']);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const conversationId = await MySQLAdpater.findOrCreateConversation(body.senderId, body.receiverId);
      const messageId = await MySQLAdpater.createMessage({
        text: body.text,
        image: body.image || null,
        senderId: body.senderId,
        receiverId: body.receiverId,
        conversationId: String(conversationId),
      });
      return res.status(201).json({ messageId, conversationId });
    } catch (error: any) {
      console.error('Error processing conversation or message:', error);
      return res.status(500).json({ error: 'Failed to process request', details: error.message });
    }
  }

  // Handle unsupported methods
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${method} Not Allowed` });
}
