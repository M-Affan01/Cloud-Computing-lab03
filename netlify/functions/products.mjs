import { getDatabase } from "@netlify/database";

export default async function handler() {
  try {
    const db = getDatabase();

    const products = await db.sql`
      SELECT * FROM products
      ORDER BY id ASC
    `;

    return new Response(
      JSON.stringify({
        success: true,
        products: products
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error("DB ERROR:", error);

    return new Response(
      JSON.stringify({
        success: false,
        products: [],
        error: error.message
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
