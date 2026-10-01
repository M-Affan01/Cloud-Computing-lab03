import { getDatabase } from "@netlify/database";

export default async function handler() {
  try {
    const db = getDatabase();

    const products = await db.sql`
      SELECT
        id,
        name,
        category,
        price,
        old_price,
        image,
        stock
      FROM products
      ORDER BY id ASC
    `;

    return Response.json({
      success: true,
      products
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: error.message,
        products: []
      },
      {
        status: 500
      }
    );
  }
}
