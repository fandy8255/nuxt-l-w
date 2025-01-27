export default {
	async fetch(request, env) {
		// Define the CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*', // Replace '*' with your specific origin if needed
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle the preflight OPTIONS request
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// Proceed with handling other request methods
		try {
			const { pathname } = new URL(request.url);

			if (request.method === "POST") {
				/*
				if (pathname === "/api/addComment") {
					const { productSlug, customerName, comment } = await request.json();

					// Check that required fields are present
					if (!productSlug || !customerName || !comment) {
						return new Response("All fields are required", { status: 400 });
					}

					// Insert the comment into the D1 database
					const query = `INSERT INTO Comments (productSlug, customerName,comment) VALUES (?, ?, ?)`;
					const response = await env.DB.prepare(query).bind(productSlug, customerName, comment).run();


					// Return the response with CORS headers added
					return new Response(JSON.stringify({ data: "Data saved successfully" }), {
						...response,
						headers: { ...response.headers, ...corsHeaders },
					});
				}*/
			} else {
				const params = new URL(request.url).searchParams
				if (pathname === "/api/getProducts") {

					const productName = params.get("product");
					let query=null
					let results=null;
					if(productName){
						 query =`SELECT * FROM products WHERE product_name = ?;`;
						 results = await env.DB.prepare(query).bind(productName).all();
					}else{
						query =`SELECT * FROM products;`;
						results = await env.DB.prepare(query).bind().all();
					}

					return new Response(JSON.stringify({ data: results }), {
						headers: { ...corsHeaders },
					});
				}
				if (pathname === "/api/products") {
      				// Fetch filter parameters
			      const category = params.get("product_category");
			      const maxPrice = params.get("product_price"); // Filter by max price
			      const minAge = params.get("user_age");       // Filter by minimum seller age

			      // Build query
			      let query = `
			        SELECT products.id, product_name, product_price, product_description, product_category, product_url, sellers.username, sellers.age
			        FROM products
			        INNER JOIN sellers ON products.seller_id = sellers.id
			        WHERE 1=1
			      `;

			      // Add filters if present
			      const queryParams = [];
			      if (category) {
			        query += " AND product_category = ?";
			        queryParams.push(category);
			      }
			      if (maxPrice) {
			        query += " AND product_price <= ?";
			        queryParams.push(maxPrice);
			      }
			      if (minAge) {
			        query += " AND sellers.age >= ?";
			        queryParams.push(minAge);
			      }

			      try {
			        //const statement = env.DB.prepare(query);
			        //const results = statement.all(...queryParams);
			        const results=await env.DB.prepare(query).bind(...queryParams).all()

			        return new Response(JSON.stringify({ data: results,query:query, queryParams:queryParams }), {
						headers: { ...corsHeaders },
					});

			      } catch (error) {
			        return new Response("Error querying database: " + error.message, { status: 500 });
			      }
			    }else {
					return new Response("no endpoint found", { status: 400 });
				}

			}
		} catch (error) {
			// Handle errors and include CORS headers in error response
			console.log(error)
			return new Response('Internal Server Error', {
				status: 500,
				headers: corsHeaders,
			});
		}
	},

};
