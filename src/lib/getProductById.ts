import MySQLAdpater from './mysqlAdapter';

interface Params {
  productId?: string;
}

export default async function getProductById(params: Params) {
  try {
    const { productId } = params;
    if (!productId) {
      return null;
    }
    const product = await MySQLAdpater.getProductWithUser(productId);
    if (!product) return null;
    return product;
  } catch (error: any) {
    throw new Error(error);
  }
}
