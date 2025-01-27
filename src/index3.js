export default {
	async fetch(request, env) {
		// Define the CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*', // Replace '*' with your specific origin if needed
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
		};

		// Handle the preflight OPTIONS request
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const authHeader = request.headers.get('Authorization');
		const expectedKey = env.SECRET_API_KEY;

		//console.log('expected', expectedKey)
		//console.log('received', authHeader)

		if (authHeader !== `Bearer ${expectedKey}`) {
			//console.log(env.SECRET_API_KEY)
			//console.log('error mistmatch')
			//console.error('expected2', expectedKey)
			//console.error('received2', authHeader)
			return new Response('Unauthorized', {
				headers: { ...corsHeaders },
			})
			//return new Response('Unauthorized', { status: 401 });
		}

		// Proceed with handling other request methods
		try {
			const { pathname } = new URL(request.url);
			const params = new URL(request.url).searchParams

			if (request.method === "POST") {

				if (pathname === "/api/user") {
					console.log('arrived to post req for user')
					try {
						const { id, email, user_type, age } = await request.json();

						if (!id || !email || age === undefined) {
							return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
						}

						const query = `
						INSERT INTO users (id, email, user_type, age)
						VALUES (?, ?, ?, ?)
					  `;
						const response = await env.DB.prepare(query).bind(id, email, user_type, age).run();

						return new Response(JSON.stringify({ data: "Data saved successfully" }), {
							...response,
							headers: { ...response.headers, ...corsHeaders },
						});

					} catch (err) {
						console.error(err);
						return new Response(JSON.stringify({ error: "Failed to add user" }), { status: 500 });
					}
				}

				else if (pathname === '/api/user/update') {

					const userId = request.headers.get('X-User-ID');
					if (!userId) {
						return new Response('User ID not provided', { status: 400 });
					}

					async function updateUser(request, env) {

						const { username, description, profilePicture } = await request.json();
						/*
						const formData = await request.formData();
						const username = formData.get('username');
						const description = formData.get('description');
						const verified = formData.get('verified') === 'true';
						const profilePicture = formData.get('profilePicture'); // Puede manejarse con almacenamiento externo*/

						// Validar que el nombre de usuario es único
						const queryCheckUsername = `SELECT id FROM users WHERE username = ?`;
						const existingUser = await env.DB.prepare(queryCheckUsername).bind(username).first();
						if (existingUser) {
							return new Response(
								JSON.stringify({ error: 'El nombre de usuario ya está en uso.' }),
								{ status: 400, headers: { 'Content-Type': 'application/json' } }
							);
						}

						// Actualizar usuario en la base de datos
						const queryUpdate = `
						  UPDATE users
						  SET username = ?, profile_description = ?, verified = ?
						  WHERE id = ?;`;
						//const userId = 'user-id-aqui'; // Obtener el ID del usuario actual de la sesión/token
						await env.DB.prepare(queryUpdate)
							.bind(username, description, 1, userId)
							.run();

						return new Response(JSON.stringify({ success: true }), {
							status: 200,
							headers: { ...corsHeaders },
						});
					}
					return updateUser(request, env);

				} else if (pathname === '/api/uploadFile') {
					console.log('got the request')

					const contentType = request.headers.get('Content-Type') || '';

					const userId = request.headers.get('X-User-ID');
					if (!userId) {
						//return new Response('User ID not provided', { status: 400 });
						return new Response('User ID not provided', {
							status: 400,
							headers: { ...corsHeaders },
						});
					}

					if (contentType.includes('multipart/form-data')) {
						const formData = await request.formData();
						const file = formData.get('file'); // Retrieve the uploaded file
						console.log('retieved file', file)
						if (file) {
							// Upload the file to BunnyCDN (adjust your existing upload logic here)
							const STORAGE_ZONE_NAME = 'lingerie';
							const FILENAME_TO_UPLOAD = file.name
							console.log('filename', FILENAME_TO_UPLOAD)
							//const ACCESS_KEY = 'YOUR_BUNNY_STORAGE_API_KEY';
							const ACCESS_KEY=env.BUNNY_CDN_KEY
							const REGION = '';
							//const BASE_HOSTNAME = 'storage.bunnycdn.com';
							const BASE_HOSTNAME='storage.bunnycdn.com'
							const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;

							const url = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${FILENAME_TO_UPLOAD}`;
							console.log('urlll', url)
							//const url =`https://lingerie.b-cdn.net/lingerie/`
							//const url='lingerie.b-cdn.net'

							const response = await fetch(url, {
								method: 'PUT',
								headers: {
									AccessKey: ACCESS_KEY,
									'Content-Type': file.type || 'application/octet-stream',
								},
								body: await file.arrayBuffer(),
							});

							if (response.ok) {
								return new Response(JSON.stringify({ success: true }), {
									status: 200,
									headers: { ...corsHeaders },
								});
							} else {
								console.error(response.status)
								return new Response(
									`Failed to upload file. Status: ${response.status} - ${await response.text()}`,
									{ status: response.status,
										headers: { ...corsHeaders }
									 }
								);
							}
						} else {
							console.error(response.status)
							return new Response('No file provided.', {
								status: 200,
								headers: { ...corsHeaders },
							});

							//return new Response('No file provided.', { status: 400 });
						}
					} else {
						console.error(response.status)
						return new Response('Invalid content type', {
							status: 200,
							headers: { ...corsHeaders },
						});
						//return new Response('Invalid content type.', { status: 400 });
					}

				}

			} else {

				if (pathname === '/api/user') { //get user data
					const userId = request.headers.get('X-User-ID');
					if (!userId) {
						return new Response('User ID not provided', { status: 400 });
					}
					const results = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

					if (!results) {
						return new Response('User not found', { status: 404 });
					}
					return new Response(JSON.stringify({ data: results }), {
						headers: { ...corsHeaders },
					});
				}

				if (pathname === "/api/getProducts") { //get products

					const productName = params.get("product");
					let query = null
					let results = null;
					if (productName) {
						query = `SELECT * FROM products WHERE product_name = ?;`;
						results = await env.DB.prepare(query).bind(productName).all();
					} else {
						query = `SELECT * FROM products;`;
						results = await env.DB.prepare(query).bind().all();
					}
					return new Response(JSON.stringify({ data: results }), {
						headers: { ...corsHeaders },
					});
				}
				if (pathname === "/api/products") {

					// Fetch filter parameters
					const category = params.get("product_category");
					const minPrice = params.get("minPrice");
					const maxPrice = params.get("maxPrice");
					const minAge = params.get("minAge");
					const maxAge = params.get("maxAge");

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
					if (minPrice) {
						query += " AND product_price >= ?";
						queryParams.push(minPrice);
					}
					if (maxPrice) {
						query += " AND product_price <= ?";
						queryParams.push(maxPrice);
					}
					if (minAge) {
						query += " AND sellers.age >= ?";
						queryParams.push(minAge);
					}
					if (maxAge) {
						query += " AND sellers.age <= ?";
						queryParams.push(maxAge);
					}
					try {
						const results = await env.DB.prepare(query).bind(...queryParams).all()
						return new Response(JSON.stringify({ data: results }), {
							headers: { ...corsHeaders },
						});

					} catch (error) {
						return new Response("Error querying database: " + error.message, { status: 500 });
					}
				} else {
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

