import getCurrentUser from '@/lib/getCurrentUser';
import MySQLAdpater from '@/lib/mysqlAdapter';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const currentUser = await getCurrentUser(req, res);

    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { title, description, imageSrc, category, latitude, longitude, price } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !imageSrc ||
      latitude === undefined ||
      longitude === undefined ||
      price === undefined
    ) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    try {
      const product = await MySQLAdpater.createProduct({
        title,
        description,
        imageSrc,
        category,
        latitude,
        longitude,
        userId: currentUser.id,
        price: Number(price),
      });
      return res.status(201).json(product);
    } catch (error) {
      console.log('Error creating product:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
