import { getDatabase } from "@netlify/database";

export default async function handler(request) {

  if (request.method !== "POST") {
    return Response.json(
      {
        success: false,
        error: "POST request required"
      },
      { status: 405 }
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
      return Response.json(
        {
          success: false,
          error: "Missing order information"
        },
        { status: 400 }
      );
    }

    const db = getDatabase();

    let total = 0;
    const checkedProducts = [];

    /*
     * Check products and calculate total
     */

    for (const item of items) {

      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return Response.json(
          {
            success: false,
            error: "Invalid product or quantity"
          },
          { status: 400 }
        );
      }

      const products = await db.sql`
        SELECT
          id,
          name,
          price,
          stock
        FROM products
        WHERE id = ${productId}
      `;

      if (products.length === 0) {
        return Response.json(
          {
            success: false,
            error: "Product not found"
          },
          { status: 404 }
        );
      }

      const product = products[0];

      if (Number(product.stock) < quantity) {
        return Response.json(
          {
            success: false,
            error: `${product.name} is out of stock`
          },
          { status: 400 }
        );
      }

      total +=
        Number(product.price) * quantity;

      checkedProducts.push({
        product,
        quantity
      });
    }

    /*
     * Create customer
     */

    const customerRows = await db.sql`
      INSERT INTO customers
      (
        name,
        email,
        phone,
        address
      )
      VALUES
      (
        ${name},
        ${email},
        ${phone},
        ${address}
      )
      RETURNING id
    `;

    const customerId =
      customerRows[0].id;

    /*
     * Create order
     */

    const orderRows = await db.sql`
      INSERT INTO orders
      (
        customer_id,
        total,
        status
      )
      VALUES
      (
        ${customerId},
        ${total.toFixed(2)},
        'pending'
      )
      RETURNING
        id,
        total,
        status,
        created_at
    `;

    const order = orderRows[0];

    /*
     * Save order items
     */

    for (const item of checkedProducts) {

      const product = item.product;
      const quantity = item.quantity;

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

    return Response.json(
      {
        success: true,
        message: "Order created successfully",
        order: order
      },
      { status: 201 }
    );

  } catch (error) {

    console.error(
      "ORDER DATABASE ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
