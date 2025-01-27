export default {
	async fetch(request, env) {
		// Define the CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*', // Replace '*' with your specific origin if needed
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User, X-User-s',
		};

		async function getUserByUsername(username) {

			const query = `SELECT * FROM users WHERE username = ? LIMIT 1`;
			const results = await env.DB.prepare(query).bind(username).first();
			return results

		}

		async function getUserById(id) {

			const query = `SELECT * FROM users WHERE id = ? LIMIT 1`;
			const results = await env.DB.prepare(query).bind(id).first();
			return results

		}

		async function uploadImage(username, filetype, file) {

			const STORAGE_ZONE_NAME = 'lingerie';
			//const FILENAME_TO_UPLOAD = `${username}/${filetype}/${file.name}`;
			const ACCESS_KEY = env.BUNNY_CDN_KEY;
			const BASE_HOSTNAME = 'storage.bunnycdn.com';
			let uuid = crypto.randomUUID()
			const fileName = file.name || 'file';
			const fileExt = fileName.substring(fileName.lastIndexOf('.') + 1);
			//const fileURL=username + "_"+uuid+fileExt
			const fileURL = `${username}_${uuid}.${fileExt}`

			const url = `https://${BASE_HOSTNAME}/${STORAGE_ZONE_NAME}/${username}/${filetype}/${fileURL}`;

			const uploadResponse = await fetch(url, {
				method: 'PUT',
				headers: {
					AccessKey: ACCESS_KEY,
					'Content-Type': file.type || 'application/octet-stream',
				},
				body: await file.arrayBuffer(),
			});

			if (!uploadResponse.ok) {
				return null
			}

			//let uploadedUrl = `https://lingerie.b-cdn.net/${username}/${filetype}/${fileURL}`
			let uploadedPath = `${username}/${filetype}/${fileURL}`
			return uploadedPath

		}

		async function uploadImages(username, filetype, files) {
			const STORAGE_ZONE_NAME = 'lingerie';
			const ACCESS_KEY = env.BUNNY_CDN_KEY;
			const BASE_HOSTNAME = 'storage.bunnycdn.com';

			// To store the uploaded paths
			const uploadedPaths = [];

			for (const file of files) {
				const uuid = crypto.randomUUID();
				const fileName = file.name || 'file';
				const fileExt = fileName.substring(fileName.lastIndexOf('.') + 1);
				const fileURL = `${username}_${uuid}.${fileExt}`;
				const url = `https://${BASE_HOSTNAME}/${STORAGE_ZONE_NAME}/${username}/${filetype}/${fileURL}`;

				const uploadResponse = await fetch(url, {
					method: 'PUT',
					headers: {
						AccessKey: ACCESS_KEY,
						'Content-Type': file.type || 'application/octet-stream',
					},
					body: await file.arrayBuffer(),
				});

				if (uploadResponse.ok) {
					const uploadedPath = `${username}/${filetype}/${fileURL}`;
					uploadedPaths.push(uploadedPath);
				} else {
					console.error(`Failed to upload file: ${file.name}`);
				}
			}

			return uploadedPaths; // Return an array of uploaded paths
		}

		async function deleteImage(path) {

			try {
				console.log('deleting image')
				const BASE_URL = 'storage.bunnycdn.com'
				const ACCESS_KEY = env.BUNNY_CDN_KEY;
				const STORAGE_ZONE_NAME = 'lingerie';

				const url = `https://${BASE_URL}/${STORAGE_ZONE_NAME}/${path}`;
				const options = { method: 'DELETE', headers: { AccessKey: env.BUNNY_CDN_KEY } };

				await fetch(url, options)
					.then(res => res.json())
					.then(json => console.log(json))
					.catch(err => console.error(err));

				return `succesfully deleted image with path : ${path}`

			} catch (error) {

				console.error('error deleting', error)

			}


		}

		// Handle the preflight OPTIONS request
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const authHeader = request.headers.get('Authorization');
		const expectedKey = env.SECRET_API_KEY;

		if (authHeader !== `Bearer ${expectedKey}`) {

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
					//console.log('arrived to post req for user')
					try {
						const { id, email, username, user_type, ubicacion, age } = await request.json();

						if (!id || !email || !username || !ubicacion || age === undefined) {
							return new Response(JSON.stringify({ error: "Llena todos los campos porfavor" }), { status: 400 });
						}

						const query = `
						INSERT INTO users (id, email,username, user_type,ubicacion, age)
						VALUES (?, ?, ?, ?, ?, ?)
					  `;
						const response = await env.DB.prepare(query).bind(id, email, username, user_type, ubicacion, age).run();

						return new Response(JSON.stringify({ data: "Data saved successfully" }), {
							...response,
							headers: { ...response.headers, ...corsHeaders },
						});

					} catch (err) {
						console.error(err);
						return new Response(JSON.stringify({ error: "Failed to add user" }), { status: 500 });
					}
				}

				if (pathname === '/api/user/check') { //check if user exists
					const { username, email } = await request.json()

					const queryCheckUsername = `SELECT id FROM users WHERE username = ?`;
					const existingUser = await env.DB.prepare(queryCheckUsername).bind(username).first();

					const queryCheckEmail = `SELECT id FROM users WHERE email = ?`;
					const existingEmail = await env.DB.prepare(queryCheckEmail).bind(email).first();

					if (existingUser || existingEmail) {
						return new Response(JSON.stringify({ error: 'El nombre de usuario o correo ya está en uso.' }), {
							status: 400,
							headers: { ...corsHeaders },
						}
						);
					}

					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { ...corsHeaders },
					});

				}

				else if (pathname === '/api/user/update') {

					let user = request.headers.get('X-User');
					user = JSON.parse(user)
					const userId = user.id

					if (!userId) {
						return new Response('Access denied', { status: 400 });
					}

					async function updateUser(request, env, userId) {

						let user = await getUserById(userId)
						let username = user.username

						const formData = await request.formData();
						const file = formData.get('file')
						let newImagePath = ''

						if (file) {
							console.log('got user', user)
							if (user) {
								let profile_picture = user.profile_picture
								console.log('profile_pic', profile_picture)
								if (profile_picture) {
									let deleted = await deleteImage(profile_picture)
									console.log('deleted', deleted)
									newImagePath = await uploadImage(username, 'profile_image', file)
									console.log('found profile image and new one is', newImagePath)
								} else {
									console.log('didnt find profile pic')
									newImagePath = await uploadImage(username, 'profile_image', file)
									console.log('didnt find profile image and new one is', newImagePath)
								}
							}
						}

						console.log('new image path after', newImagePath)

						const description = formData.get('profile_description');
						const ubicacion = formData.get('ubicacion');
						//const profilePicture = formData.get('profile_picture'); // Puede manejarse con almacenamiento externo*/

						// Actualizar usuario en la base de datos
						const queryUpdate = `
						  UPDATE users
						  SET username = ?, profile_description = ?, profile_picture = ?, ubicacion =?
						  WHERE id = ?;`;
						//const userId = 'user-id-aqui'; // Obtener el ID del usuario actual de la sesión/token
						let results = await env.DB.prepare(queryUpdate)
							.bind(username, description, newImagePath, ubicacion, userId)
							.run();
						let resultsObj = {
							profile_description: description,
							ubicacion: ubicacion,
							profile_picture: newImagePath,

						}
						console.log('results', results)

						return new Response(JSON.stringify({ success: true, data: JSON.stringify(resultsObj) }), {
							status: 200,
							headers: { ...corsHeaders },
						});
					}
					return updateUser(request, env, userId);

				} else if (pathname === '/api/uploadProduct') {


					const contentType = request.headers.get('Content-Type') || '';
					let user = request.headers.get('X-User');
					let obj = request.headers.get('X-User-s');

					user = JSON.parse(user);
					obj = JSON.parse(obj);
					let user_type = obj.user_type;

					const userId = user.id;
					const sameEmail = obj.email === user.email;
					const userIsSeller = user_type === 'seller';

					if (!userId || !sameEmail || !userIsSeller) {
						return new Response('Unauthorized request', {
							status: 400,
							headers: { ...corsHeaders },
						});
					}


					if (contentType.includes('multipart/form-data')) {
						const formData = await request.formData();
						const files = formData.getAll('file'); // Get all uploaded files
						const username = formData.get('username');
						const productName = formData.get('product_name');
						const productPrice = formData.get('product_price');
						const productDescription = formData.get('product_description');
						const productCategory = formData.get('product_category');

						if (!files.length || !productName || !productPrice || !productDescription || !productCategory || !username) {
							return new Response('Missing required fields', {
								status: 400,
								headers: { ...corsHeaders },
							});
						}

						const imageUrls = [];
						let productId = null;

						try {
							// Upload all images to Bunny CDN
							for (const file of files) {
								const imageURL = await uploadImage(username, 'product_images', file);
								if (!imageURL) {
									throw new Error('Failed to upload an image to Bunny CDN');

								}
								imageUrls.push(imageURL);
							}

							// Insert uploaded image URLs into product_images table
							const insertedImageIds = [];
							for (const imageUrl of imageUrls) {
								const imageQuery = `
									INSERT INTO product_images (image_url)
									VALUES (?)
									RETURNING id`;
								const imageResponse = await env.DB.prepare(imageQuery).bind(imageUrl).first();

								if (!imageResponse || !imageResponse.id) {
									throw new Error('Failed to insert image URL into product_images table');
								}

								insertedImageIds.push(imageResponse.id);
							}

							// Use the first uploaded image as the main image
							const mainImageUrl = imageUrls[0];

							// Insert product into the products table
							const productQuery = `
								INSERT INTO products (product_name, product_price, product_description, product_category, product_url, user_id)
								VALUES (?, ?, ?, ?, ?, ?)
								RETURNING id`;
							const productResponse = await env.DB.prepare(productQuery)
								.bind(productName, productPrice, productDescription, productCategory, mainImageUrl, userId)
								.first();

							if (!productResponse || !productResponse.id) {
								throw new Error('Failed to insert product into database');
							}

							productId = productResponse.id;

							// Associate each product image with the newly created product
							for (const imageId of insertedImageIds) {
								const associationQuery = `
									UPDATE product_images
									SET product_id = ?
									WHERE id = ?`;
								const associationResponse = await env.DB.prepare(associationQuery).bind(productId, imageId).run();

								if (!associationResponse.success) {
									throw new Error('Failed to associate image with product');
								}
							}

							const prodObj = {
								id: productId,
								product_name: productName,
								product_price: productPrice,
								product_description: productDescription,
								product_category: productCategory,
								product_url: mainImageUrl,
								username: username
							}

							return new Response(JSON.stringify({ success: true, product: prodObj }), {
								status: 200,
								headers: { ...corsHeaders },
							});

						} catch (error) {
							console.error(error.message);

							// Rollback: Remove uploaded images from product_images if any part fails
							for (const imageUrl of imageUrls) {
								const rollbackImageQuery = `
									DELETE FROM product_images
									WHERE image_url = ?`;
								await env.DB.prepare(rollbackImageQuery).bind(imageUrl).run();
							}

							// Rollback: Remove product from products table if it was created
							if (productId) {
								const rollbackProductQuery = `
									DELETE FROM products
									WHERE id = ?`;
								await env.DB.prepare(rollbackProductQuery).bind(productId).run();
							}

							return new Response('Error occurred during product upload: ' + error.message, {
								status: 500,
								headers: { ...corsHeaders },
							});
						}
					} else {
						return new Response('Invalid content type', {
							status: 400,
							headers: { ...corsHeaders },
						});
					}

				}

				if (pathname === '/api/deleteProduct') {

					try {

						const { productId, user_tok } = await request.json();
						console.log('deleted productid was :', productId)
						const imageQuery = `
									SELECT * FROM product_images
									WHERE product_id = ?`;

						let imgUrls = await env.DB.prepare(imageQuery).bind(productId).all();
						//console.log("imgurllss", imgUrls)

						//let path = ""
						for (const imgUrl of imgUrls.results) {
							console.log('deleted image url', imgUrl.image_url)
							await deleteImage(imgUrl.image_url)
						}

						const query = `
									DELETE FROM products
									WHERE id = ?`;

						await env.DB.prepare(query).bind(productId).run();

						return new Response(JSON.stringify({ success: true, imgUrls: imgUrls.results, productId: productId }), {
							status: 200,
							headers: { ...corsHeaders },
						});

					} catch (error) {
						console.error('error', error)
						return new Response('error with the request', {
							status: 400,
							headers: { ...corsHeaders },
						});
					}

				}

				if (pathname === '/api/follow') {
					const { follower, followed } = await request.json();

					if (!follower || !followed) {
						return new Response('Follower and followed are required', { status: 400 });
					}

					const uuid = crypto.randomUUID();

					const query = `
					INSERT INTO followers (id, follower_id, followed_id)
					SELECT ?, u1.id, u2.id
					FROM users u1, users u2
					WHERE u1.username = ? AND u2.username = ?
					ON CONFLICT (follower_id, followed_id) DO NOTHING;
					`;

					try {
						const result = await env.DB.prepare(query).bind(uuid, follower, followed).run();
						return new Response(JSON.stringify({ success: true, result }), { status: 200, headers: { ...corsHeaders } });
					} catch (error) {
						return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders } });
					}


				}

				if (pathname === '/api/unfollow') {
					const { follower, followed } = await request.json();

					if (!follower || !followed) {
						return new Response('Follower and followed are required', { status: 400 });
					}

					const query = `
						DELETE FROM followers
						WHERE follower_id = (SELECT id FROM users WHERE username = ?)
						AND followed_id = (SELECT id FROM users WHERE username = ?);
						`;

					try {
						const result = await env.DB.prepare(query).bind(follower, followed).run();
						return new Response(JSON.stringify({ success: true, result }), { status: 200, headers: { ...corsHeaders } });
					} catch (error) {
						return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders } });
					}
				}



				if (pathname === '/api/message') {

					try {
						// Parse the request data
						console.log('got the request')
						const { receiver, content, title } = await request.json();



						let senderObj = request.headers.get('X-User');
						senderObj = JSON.parse(senderObj);
						const sender = senderObj.id;

						console.log('sender', sender)
						console.log('content', content)
						console.log('title', title)
						console.log('receiver', receiver)

						if (!sender || !receiver || !content) {
							console.error("Missing sender, receiver, or content")
							return new Response("Missing sender, receiver, or content", {
								status: 400,
								headers: { ...corsHeaders }
							});
						}


						const now = new Date().toISOString();

						// Check if thread exists between sender and receiver
						const existingThreadQuery = `
						  SELECT thread_id FROM threads
						  WHERE (sender = ? AND receiver = ?)
							 OR (sender = ? AND receiver = ?)
							 AND is_deleted = 0
						  LIMIT 1
						`;

						const results = await env.DB.prepare(existingThreadQuery)
							.bind(sender, receiver, receiver, sender)
							.first();

						console.log('results', results)

						let thread_id = results?.thread_id;
						console.log('threaddd id', thread_id)

						// If no thread exists, create a new thread
						if (!thread_id) {
							//console.log('no thread id found')
							const newThreadQuery = `
							INSERT INTO threads (thread_id, thread_title, sender, receiver, is_deleted, created_at, last_updated_at)
							VALUES (?, ?, ?, ?, ?, ?, ?)
						  `;
							thread_id = crypto.randomUUID();
							console.log('randomthread id:', thread_id)
							await env.DB.prepare(newThreadQuery).bind(thread_id, title, sender, receiver, 0, now, now).run();
							console.log('finished creating thread')
						}

						// Insert the message into the messages table
						const insertMessageQuery = `
						  INSERT INTO messages (message_id, thread_id, message_owner, receiver, content, is_read, is_deleted, created_at)
						  VALUES (?, ?, ?, ?, ?, FALSE, FALSE, ?)
						`;
						const message_id = crypto.randomUUID();
						await env.DB.prepare(insertMessageQuery)
							.bind(message_id, thread_id, sender, receiver, content, now)
							.run();

						return new Response(JSON.stringify({ success: true, thread_id, message_id }), {
							status: 200,
							headers: { ...corsHeaders },
						});
					} catch (error) {
						console.error(error)
						return new Response(`Error: ${error.message}`,
							{
								status: 500,
								headers: { ...corsHeaders },
							});
					}

				}




			} else {


				if (pathname === '/api/profile') { //get user data

					try {
						let user = request.headers.get('X-User');
						user = JSON.parse(user)
						const userId = user.id

						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}
						const results = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

						if (!results) {
							return new Response('User not found', { status: 404, headers: { ...corsHeaders } });
						}
						return new Response(JSON.stringify({ data: results }), {
							headers: { ...corsHeaders },
						});

					} catch (error) {
						console.log('error', error)
						return new Response(JSON.stringify({ message: 'error', details: error.message }), { status: 500, headers: { ...corsHeaders } });

					}

				}

				if(pathname === '/test'){
					
				}


				if (pathname === '/api/followers') {
					try {
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						// Fetch followers
						const followersResults = await env.DB.prepare(`
						SELECT u.username 
						FROM followers f
						JOIN users u ON f.follower_id = u.id
						WHERE f.followed_id = ?
					  `).bind(userId).all();

						return new Response(JSON.stringify({ followers: followersResults.results.map(row => row.username) }), {
							headers: { ...corsHeaders },
						});
					} catch (error) {
						console.error('Error fetching followers:', error);
						return new Response(JSON.stringify({ message: 'Error', details: error.message }), {
							status: 500, headers: { ...corsHeaders }
						});
					}
				}

				if (pathname === '/api/followed') {
					try {
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						// Fetch followed users
						const followedResults = await env.DB.prepare(`
							SELECT u.username 
							FROM followers f
							JOIN users u ON f.followed_id = u.id
							WHERE f.follower_id = ?
							`).bind(userId).all();

						return new Response(JSON.stringify({ followed: followedResults.results.map(row => row.username) }), {
							headers: { ...corsHeaders },
						});
					} catch (error) {
						console.error('Error fetching followed users:', error);
						return new Response(JSON.stringify({ message: 'Error', details: error.message }), {
							status: 500, headers: { ...corsHeaders }
						});
					}
				}



				if (pathname === '/api/user') {

					const username = params.get('username'); // Extract the username slug
					console.log('username', username)
					if (!username) {
						return new Response('Username not provided', { status: 404, headers: { ...corsHeaders } });
					}

					let results = await getUserByUsername(username)

					try {

						if (!results) {
							return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { ...corsHeaders } });
						}
						return new Response(JSON.stringify(results), { status: 200, headers: { ...corsHeaders } });

					} catch (error) {
						return new Response(JSON.stringify({ message: 'Database error', details: error.message }), { status: 500, headers: { ...corsHeaders } });
					}
				}

				if (pathname === '/api/threads') {

					try {
						//console.log('got full threads req')
						//console.error('testing error')
						let user = request.headers.get('X-User');
						user = JSON.parse(user)
						const userId = user.id

						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						const query = `SELECT
										t.thread_id,
										t.sender,
										sender_user.username AS sender_name,
										sender_user.profile_picture AS sender_profile_picture,
										t.receiver,
										receiver_user.username AS receiver_name,
										receiver_user.profile_picture AS receiver_profile_picture,
										t.last_updated_at,
										m.content AS last_message
									FROM threads t
									LEFT JOIN messages m
										ON t.thread_id = m.thread_id
										AND m.created_at = (
											SELECT MAX(created_at) FROM messages WHERE thread_id = t.thread_id
										)
									LEFT JOIN users sender_user
										ON t.sender = sender_user.id
									LEFT JOIN users receiver_user
										ON t.receiver = receiver_user.id
									WHERE t.sender = ? OR t.receiver = ?
									ORDER BY t.last_updated_at DESC;
									`

						const results = await env.DB.prepare(query).bind(userId, userId).all();

						return new Response(JSON.stringify(results.results), {
							headers: { ...corsHeaders },
						});


					} catch (error) {
						console.error('Error fetching threads:', error);
						return new Response('Internal Server Error', { status: 500, headers: { ...corsHeaders } });

					}


				}

				if (pathname === "/api/thread") {

					//get all messages from thread

					try {
						// Extract thread ID from query params
						//console.log('got the request cmno')
						const threadId = params.get("id");
						//console.log('the thread is is:', threadId)
						if (!threadId) {
							console.error('no thread id')
							return new Response('no thread id', { status: 400, headers: { ...corsHeaders } });
						}

						// Extract and validate the user from headers
						let user = request.headers.get("X-User");
						if (!user) {
							console.error('no user')
							return new Response('no user', { status: 400, headers: { ...corsHeaders } });
						}

						user = JSON.parse(user);
						const userId = user.id;

						// Verify if the user belongs to the thread
						const { results: thread } = await env.DB.prepare(`
						SELECT sender, receiver 
						FROM threads 
						WHERE thread_id = ? AND is_deleted = 0
					  `).bind(threadId).all();

						if (!thread.length) {
							console.error('no threads')
							return new Response('no threads', { status: 400, headers: { ...corsHeaders } });
						}

						const { sender, receiver } = thread[0];
						if (userId !== sender && userId !== receiver) {
							console.error('unathorized')
							return new Response("unauthorized", { status: 400, headers: { ...corsHeaders } });
						}

						// Fetch messages and user details
						const { results: messages } = await env.DB.prepare(`
						SELECT 
						  m.message_id,
						  m.content,
						  m.created_at,
						  m.message_owner,
						  u1.username AS sender_username,
						  u1.id AS sender_id,
						  u1.profile_picture AS sender_profile_picture,
						  u2.username AS receiver_username,
						  u2.id AS receiver_id,
						  u2.profile_picture AS receiver_profile_picture
						FROM messages m
						JOIN threads t ON m.thread_id = t.thread_id
						JOIN users u1 ON t.sender = u1.id
						JOIN users u2 ON t.receiver = u2.id
						WHERE m.thread_id = ? AND m.is_deleted = 0
						ORDER BY m.created_at ASC
					  `).bind(threadId).all();

						return new Response(JSON.stringify({ messages }), {
							headers: { ...corsHeaders },
						});
					} catch (error) {
						console.error(error)
						console.error("Error:", error.message);
						return new Response(JSON.stringify({ error: error }), { status: 400, headers: { ...corsHeaders } });
					}

				}


				if (pathname === "/api/getProducts") { //get products

					const productId = params.get("product_id");
					const userId = params.get('user_id')
					let query = null
					let results = null;
					if (productId) {
						// Query to fetch product, owner, and images in one go
						try {
							console.log('product id is', productId)
							query = `
								SELECT
									p.id AS product_id,
									p.product_name,
									p.product_price,
									p.product_description,
									p.product_category,
									p.product_url AS main_image_url,
									u.id AS owner_id,
									u.username AS owner_username,
									u.profile_picture AS profile_picture,
									pi.id AS image_id,
									pi.image_url
								FROM
									products p
								JOIN
									users u ON p.user_id = u.id
								LEFT JOIN
									product_images pi ON pi.product_id = p.id
								WHERE
									p.id = ?`;

							// Execute the query with the provided product_id
							let result = await env.DB.prepare(query).bind(productId).all();
							//console.log('resulttt', result)

							if (!result.results || result.results.length === 0) {
								console.error('results not found')
								return new Response('Product not found', {
									status: 404,
									headers: { ...corsHeaders },
								});
							}
							console.log('got query for prodid', result)

							// Transform the results into a structured object

							results = {
								product_id: result.results[0].product_id,
								product_name: result.results[0].product_name,
								product_price: result.results[0].product_price,
								product_description: result.results[0].product_description,
								product_category: result.results[0].product_category,
								main_image_url: result.results[0].main_image_url,
								owner: {
									id: result.results[0].owner_id,
									username: result.results[0].owner_username,
									profile_picture: result.results[0].profile_picture,
								},
								images: result.results.map(row => ({
									image_id: row.image_id,
									image_url: row.image_url,
								})).filter(image => image.image_id), // Remove null image entries
							};

							console.log('result', results)

							return new Response(JSON.stringify({ data: results }), {
								headers: { ...corsHeaders },
							});

						} catch (error) {
							console.error('results not found', error)
							return new Response('Product not found', {
								status: 404,
								headers: { ...corsHeaders },
							});

						}

					}

					if (userId) {

						try {
							query = `SELECT
							products.*,
							users.username,
							users.profile_picture,
							users.ubicacion
							FROM products
							INNER JOIN users ON products.user_id = users.id
							WHERE products.user_id = ?;
      						`
							results = await env.DB.prepare(query).bind(userId).all();

							return new Response(JSON.stringify({ data: results }), {
								headers: { ...corsHeaders },
							});

						} catch (error) {
							console.error('results not found', error)
							return new Response('Product not found', {
								status: 404,
								headers: { ...corsHeaders },
							});
						}
					}

					else {
						try {
							query = `
									SELECT
									products.*,
									users.username,
									users.profile_picture,
									users.ubicacion
									FROM products
									INNER JOIN users ON products.user_id = users.id;`

							results = await env.DB.prepare(query).all();

							return new Response(JSON.stringify({ data: results }), {
								headers: { ...corsHeaders },
							});

						} catch (error) {
							console.error('results not found', error)
							return new Response('Product not found', {
								status: 404,
								headers: { ...corsHeaders },
							})
						}

					}


				}


				if (pathname === "/api/filter_products") {

					// Fetch filter parameters
					const category = params.get("product_category");
					const minPrice = params.get("minPrice");
					const maxPrice = params.get("maxPrice");
					const minAge = params.get("minAge");
					const maxAge = params.get("maxAge");
					const ubicacion = params.get("ubicacion");

					// Build query

					let query = `
					SELECT products.id, product_name, product_price, product_description, product_category, product_url, users.username, users.age, users.ubicacion
					FROM products
					INNER JOIN users ON products.user_id = users.id
					WHERE 1=1`



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
						query += " AND users.age >= ?";
						queryParams.push(minAge);
					}
					if (maxAge) {
						query += " AND users.age <= ?";
						queryParams.push(maxAge);
					}
					if (ubicacion) {
						query += " AND users.ubicacion = ?";
						queryParams.push(ubicacion);
					}
					try {
						const results = await env.DB.prepare(query).bind(...queryParams).all()
						return new Response(JSON.stringify({ data: results }), {
							headers: { ...corsHeaders },
						});

					} catch (error) {
						console.error('error', error)
						return new Response("Error querying database: " + error.message, { status: 500 });
					}
				}

				if (pathname === "/api/users") {
					// Fetch filter parameters
					const location = params.get("ubicacion");
					const minAge = params.get("minAge");
					const maxAge = params.get("maxAge");
					const verified = params.get("verified");

					// Build query
					let query = `
					  SELECT id, username, email, profile_picture, profile_description, user_type, ubicacion, age, verified
					  FROM users
					  WHERE 1=1
					`;

					// Add filters if present
					const queryParams = [];
					if (location) {
						query += " AND ubicacion = ?";
						queryParams.push(location);
					}
					if (minAge) {
						query += " AND age >= ?";
						queryParams.push(minAge);
					}
					if (maxAge) {
						query += " AND age <= ?";
						queryParams.push(maxAge);
					}
					if (verified) {
						query += " AND verified = ?";
						queryParams.push(verified === "true" ? 1 : 0); // Assuming `verified` is a boolean stored as 1/0 in the database
					}

					try {
						// Execute the query
						const results = await env.DB.prepare(query).bind(...queryParams).all();

						// Return results
						return new Response(JSON.stringify({ data: results }), {
							headers: { ...corsHeaders },
						});
					} catch (error) {
						return new Response("Error querying database: " + error.message, { status: 500, headers: { ...corsHeaders } });
					}
				}




				else {
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

