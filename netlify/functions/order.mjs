import { getDatabase } from "@netlify/database";

export default async function handler(request) {

  if (request.method !== "POST") {

    return new Response(
      JSON.stringify({
        success: false,
        error: "POST request required"
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  try {

    const data = await request.json();

    const {
      name,
      email,
      phone,
      address,
      items
    } = data;

    if (
      !name ||
      !email ||
      !phone ||
      !address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {

      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing order information"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const db = getDatabase();

    /*
      Calculate total on the server
      instead of trusting the browser.
    */

    let total = 0;

    for (const item of items) {

      const productResult = await db.sql`
        SELECT id, name, price, stock
        FROM products
        WHERE id = ${Number(item.productId)}
      `;

      if (productResult.rows.length === 0) {

        return new Response(
          JSON.stringify({
            success: false,
            error: `Product ${item.productId} not found`
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      const product = productResult.rows[0];

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {

        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid quantity"
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (product.stock < quantity) {

        return new Response(
          JSON.stringify({
            success: false,
            error: `${product.name} is out of stock`
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      total += Number(product.price) * quantity;
    }

    /*
      Create customer
    */

    const customerResult = await db.sql`
      INSERT INTO customers
      (name, email, phone, address)
      VALUES
      (${name}, ${email}, ${phone}, ${address})
      RETURNING id
    `;

    const customerId = customerResult.rows[0].id;

    /*
      Create order
    */

    const orderResult = await db.sql`
      INSERT INTO orders
      (customer_id, total, status)
      VALUES
      (${customerId}, ${total.toFixed(2)}, 'pending')
      RETURNING id, total, status, created_at
    `;

    const order = orderResult.rows[0];

    /*
      Save order items + decrease stock
    */

    for (const item of items) {

      const productResult = await db.sql`
        SELECT id, name, price
        FROM products
        WHERE id = ${Number(item.productId)}
      `;

      const product = productResult.rows[0];

      const quantity = Number(item.quantity);

      await db.sql`
        INSERT INTO order_items
        (
          order_id,
          product_id,
          product_name,
          quantity,
          price
        )
        VALUES
        (
          ${order.id},
          ${product.id},
          ${product.name},
          ${quantity},
          ${product.price}
        )
      `;

      await db.sql`
        UPDATE products
        SET stock = stock - ${quantity}
        WHERE id = ${product.id}
      `;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order created successfully",
        order
      }),
      {
        status: 201,
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
        error: "Server error while creating order"
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
