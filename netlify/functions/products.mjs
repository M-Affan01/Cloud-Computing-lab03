import { getDatabase } from "@netlify/database";

export default async function handler() {
  try {
    const db = getDatabase();

    const result = await db.sql`
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

    return new Response(
      JSON.stringify({
        success: true,
        products: result.rows
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {

    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Could not load products"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
