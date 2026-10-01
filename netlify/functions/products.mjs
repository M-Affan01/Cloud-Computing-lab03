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
      products: products
    });

  } catch (error) {
    console.error("DATABASE ERROR:", error);

    return Response.json(
      {
        success: false,
        products: [],
        error: error.message
      },
      { status: 500 }
    );
  }
}
