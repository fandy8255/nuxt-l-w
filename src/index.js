import { Console } from 'console';
import crypto from 'crypto';

export default {
	async fetch(request, env) {
		// Define the CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*', // Replace '*' with your specific origin if needed
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User, X-User-s, X-Timestamp',
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

		const verifyHMAC = (authHeader, timestamp) => {
			const SECRET_KEY = env.SECRET_API_KEY;

			// Check if the auth header is valid
			if (!authHeader || !authHeader.startsWith('HVAC ')) {
				console.error('No auth header or auth header does not start with HVAC');
				return false;
			}

			// Extract the signature from the auth header

			const signature = authHeader.split(' ')[1].trim(); // Trim any extra spaces
			console.log('Extracted Signature:', signature);
			console.log('authheader', authHeader)

			// Generate the expected signature using SHA-256 HMAC
			const expectedSignature = crypto.createHmac('sha256', SECRET_KEY)
				.update(timestamp)
				.digest('hex'); // Ensure the signature is in hexadecimal format
			console.log('Expected Signature:', expectedSignature);

			// Compare the signatures
			return signature === expectedSignature;
		};

		async function isAdmin(userId, env) {
			try {
				// Query the database to check if the user is an admin
				const results = await env.DB.prepare('SELECT is_admin FROM users WHERE id = ?')
					.bind(userId)
					.first();

				// If the user is not found, return false
				if (!results) {
					return false;
				}

				// Return the admin status
				return results.is_admin === 1; // Assuming is_admin is stored as 1 for true and 0 for false
			} catch (error) {
				console.error('Error checking admin status:', error.message);
				throw error; // Re-throw the error to handle it in the calling function
			}
		}


		// Handle the preflight OPTIONS request
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const authHeader = request.headers.get('Authorization');
		const timestamp = request.headers.get('X-Timestamp');

		// Reject requests with missing auth headers
		if (!authHeader || !timestamp) {
			console.error('no auth header or timestamp')
			return new Response('Unauthorized', { status: 401 });
		}

		// Verify HMAC Signature
		if (!verifyHMAC(authHeader, timestamp)) {
			return new Response('Unauthorized', { status: 401 });
		}



		// Proceed with handling other request methods
		try {
			const { pathname } = new URL(request.url);
			const params = new URL(request.url).searchParams
			const cacheTTL = 60

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

					try {

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


					} catch (error) {
						console.error('error with registrar', error)

					}


				}


				else if (pathname === '/api/user/update') {
					try {
						// Extract user data from headers
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						if (!userId) {
							return new Response('Access denied', { status: 400 });
						}

						// Parse form data
						const formData = await request.formData();
						const file = formData.get('file');
						const description = formData.get('profile_description');
						const ubicacion = formData.get('ubicacion');

						let newImagePath = '';

						// Handle file upload if a new file is provided
						if (file) {
							// Fetch the current user to get the existing profile picture
							const currentUser = await getUserById(userId);
							if (currentUser.profile_picture) {
								await deleteImage(currentUser.profile_picture); // Delete the old image
							}
							newImagePath = await uploadImage(currentUser.username, 'profile_image', file); // Upload the new image
						}

						// Dynamically build the SQL query based on provided fields
						let queryParts = [];
						let queryParams = [];

						if (description !== null) {
							queryParts.push('profile_description = ?');
							queryParams.push(description);
						}
						if (newImagePath) {
							queryParts.push('profile_picture = ?');
							queryParams.push(newImagePath);
						}
						if (ubicacion !== null) {
							queryParts.push('ubicacion = ?');
							queryParams.push(ubicacion);
						}

						// If no fields are provided to update, return an error
						if (queryParts.length === 0) {
							return new Response(JSON.stringify({ success: false, error: 'No fields to update' }), {
								status: 400,
								headers: { ...corsHeaders },
							});
						}

						// Build the final SQL query
						const queryUpdate = `
								UPDATE users
								SET ${queryParts.join(', ')}
								WHERE id = ?;
							`;
						queryParams.push(userId);

						// Execute the query
						await env.DB.prepare(queryUpdate).bind(...queryParams).run();

						// Prepare the response object
						let resultsObj = {
							profile_description: description || user.profile_description,
							ubicacion: ubicacion || user.ubicacion,
							profile_picture: newImagePath || user.profile_picture,
						};

						return new Response(JSON.stringify({ success: true, data: resultsObj }), {
							status: 200,
							headers: { ...corsHeaders },
						});
					} catch (error) {
						console.error('Error updating user:', error);
						return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}

				else if (pathname === '/api/uploadProduct') {


					const contentType = request.headers.get('Content-Type') || '';
					let user = request.headers.get('X-User');
					let obj = request.headers.get('X-User-s');

					user = JSON.parse(user);
					obj = JSON.parse(obj);
					let user_type = obj.user_type;

					const userId = user.id;
					const profile_picture = user.profile_picture
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
							const productId = crypto.randomUUID();

							const productQuery = `
								INSERT INTO products (id, product_name, product_price, product_description, product_category, product_url, user_id)
								VALUES (?, ?, ?, ?, ?, ?, ?)
								RETURNING id`;
							const productResponse = await env.DB.prepare(productQuery)
								.bind(productId, productName, productPrice, productDescription, productCategory, mainImageUrl, userId)
								.first();

							if (!productResponse || !productResponse.id) {
								throw new Error('Failed to insert product into database');
							}

							//productId = productResponse.id;

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
								user_id: userId,
								username: username,
								profile_picture: profile_picture,
								like_count: 0
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

				if (pathname === '/api/report') {
					try {
						// Parse the incoming request
						const { product_id, reporter_id, reported_id, report_reason } = await request.json();

						console.log('Reporting product:', product_id, 'by user:', reporter_id);

						// Check if the reporter has already reported this product
						const existingReportQuery = `
							SELECT COUNT(*) as count
							FROM reports
							WHERE product_id = ? AND reporter_id = ?`;

						const existingReportResult = await env.DB.prepare(existingReportQuery)
							.bind(product_id, reporter_id)
							.first();

						if (existingReportResult.count > 0) {
							return new Response(JSON.stringify({ success: false, message: 'User has already reported this product.' }), {
								status: 400,
								headers: { ...corsHeaders },
							});
						}

						// Insert the new report
						const insertReportQuery = `
							INSERT INTO reports (id, product_id, reporter_id, reported_id, report_reason)
							VALUES (?, ?, ?, ?, ?)`;

						await env.DB.prepare(insertReportQuery)
							.bind(crypto.randomUUID(), product_id, reporter_id, reported_id, report_reason)
							.run();

						// Check the total number of reports for the product
						const reportCountQuery = `
							SELECT COUNT(*) as count
							FROM reports
							WHERE product_id = ?`;

						const reportCountResult = await env.DB.prepare(reportCountQuery)
							.bind(product_id)
							.first();

						const reportCount = reportCountResult.count;

						console.log('Total reports for product:', product_id, 'are:', reportCount);

						// If the report count reaches 2, mark the product as not visible
						if (reportCount >= 2) {
							const updateProductQuery = `
								UPDATE products
								SET is_visible = 0
								WHERE id = ?`;

							await env.DB.prepare(updateProductQuery)
								.bind(product_id)
								.run();

							console.log('Product', product_id, 'has been marked as not visible due to multiple reports.');
						}

						return new Response(JSON.stringify({ success: true, message: 'Report submitted successfully.' }), {
							status: 200,
							headers: { ...corsHeaders },
						});

					} catch (error) {
						console.error('Error handling report:', error);

						return new Response(JSON.stringify({ success: false, message: 'Error handling the report.' }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}

				if (pathname === '/api/like') {
					const { liked_product, liked_by, liked_product_belongs_to } = await request.json();

					if (!liked_product || !liked_by || !liked_product_belongs_to) {
						return new Response('All fields (liked_product, liked_by, liked_product_belongs_to) are required', { status: 400 });
					}

					const uuid = crypto.randomUUID();

					const query = `
					INSERT INTO product_likes (id, liked_product, liked_by, liked_product_belongs_to)
					VALUES (?, ?, ?, ?)
					ON CONFLICT (liked_product, liked_by) DO NOTHING;
					`;

					try {
						const result = await env.DB.prepare(query)
							.bind(uuid, liked_product, liked_by, liked_product_belongs_to)
							.run();
						return new Response(JSON.stringify({ success: true, result }), {
							status: 200,
							headers: { ...corsHeaders },
						});
					} catch (error) {
						return new Response(JSON.stringify({ success: false, error: error.message }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}

				if (pathname === '/api/unlike') {
					const { liked_product, liked_by } = await request.json();

					if (!liked_product || !liked_by) {
						return new Response('Fields (liked_product and liked_by) are required', { status: 400 });
					}

					const query = `
					DELETE FROM product_likes
					WHERE liked_product = ? AND liked_by = ?;
					`;

					try {
						const result = await env.DB.prepare(query)
							.bind(liked_product, liked_by)
							.run();
						return new Response(JSON.stringify({ success: true, result }), {
							status: 200,
							headers: { ...corsHeaders },
						});
					} catch (error) {
						return new Response(JSON.stringify({ success: false, error: error.message }), {
							status: 500,
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
						ON CONFLICT (follower_id, followed_id) DO NOTHING
						RETURNING followed_id;
					`;

					try {
						// Insert and return the followed user's ID
						const result = await env.DB.prepare(query).bind(uuid, follower, followed).first();

						if (!result) {
							return new Response(JSON.stringify({ success: false, error: 'User already followed or not found' }), {
								status: 400,
								headers: { ...corsHeaders },
							});
						}

						return new Response(JSON.stringify({ success: true, followed_id: result.followed_id }), {
							status: 200,
							headers: { ...corsHeaders },
						});
					} catch (error) {
						return new Response(JSON.stringify({ success: false, error: error.message }), {
							status: 500,
							headers: { ...corsHeaders },
						});
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
							INSERT INTO threads (thread_id, thread_title, sender, receiver, created_at, last_updated_at)
							VALUES (?, ?, ?, ?, ?, ?)
						  `;
							thread_id = crypto.randomUUID();
							console.log('randomthread id:', thread_id)
							await env.DB.prepare(newThreadQuery).bind(thread_id, title, sender, receiver, now, now).run();
							console.log('finished creating thread')
						}

						// Insert the message into the messages table
						const insertMessageQuery = `
						  INSERT INTO messages (message_id, thread_id, message_owner, receiver, content, is_read, created_at)
						  VALUES (?, ?, ?, ?, ?, FALSE, ?)
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

				if (pathname === '/api/create-post') {
					try {
						const { user_id, content } = await request.json();

						if (!user_id || !content) {
							return new Response('User ID and content are required', { status: 400 });
						}

						const query = `
						INSERT INTO posts (id, user_id, content, created_at)
						VALUES (?, ?, ?, CURRENT_TIMESTAMP)
						RETURNING *
					`;

						const postId = crypto.randomUUID(); // Generate a unique ID for the post
						const result = await env.DB.prepare(query).bind(postId, user_id, content).run();

						return new Response(JSON.stringify({ success: true, postId, result }), {
							status: 200,
							headers: { ...corsHeaders }
						});
					} catch (error) {
						console.error('error', error)
						console.error('error', error.message)
						return new Response(JSON.stringify({ success: false, error: error.message }), {
							status: 500,
							headers: { ...corsHeaders }
						});
					}
				}


				if (pathname === '/api/fetch-followed-data') {
					try {
						console.log('fetched feed')
						const { followedUsers, userId } = await request.json(); // userId is the current user's ID
						console.log('followedUsers', followedUsers);

						if (!Array.isArray(followedUsers) || followedUsers.length === 0) {
							return new Response(
								JSON.stringify({ success: false, error: 'Followed users array is empty or invalid' }),
								{ status: 400, headers: { ...corsHeaders } }
							);
						}

						// Include the current user's ID in the list of user IDs
						const userIds = [...followedUsers.map(user => user.id), userId];
						const placeholders = userIds.map(() => '?').join(', ');

						const query = `
							SELECT
								'post' AS type,
								posts.id,
								posts.user_id,
								posts.content,
								posts.created_at,
								NULL AS product_name,
								NULL AS product_category,
								NULL AS product_description,
								NULL AS product_url,
								NULL AS product_price,
								NULL AS like_count,
								users.username,
								users.profile_picture
							FROM posts
							JOIN users ON posts.user_id = users.id
							WHERE posts.user_id IN (${placeholders})
							UNION ALL
							SELECT
								'product' AS type,
								products.id,
								products.user_id,
								NULL AS content,
								products.created_at,
								products.product_name,
								products.product_category,
								products.product_description,
								products.product_url,
								products.product_price,
								COUNT(product_likes.liked_product) AS like_count,
								users.username,
								users.profile_picture
							FROM products
							LEFT JOIN product_likes ON products.id = product_likes.liked_product
							JOIN users ON products.user_id = users.id
							WHERE products.user_id IN (${placeholders})
							GROUP BY products.id
						`;

						// Bind all user IDs (followed users + current user)
						const results = await env.DB.prepare(query).bind(...userIds, ...userIds).all();

						return new Response(
							JSON.stringify({ success: true, data: results.results }),
							{ status: 200, headers: { ...corsHeaders } }
						);
					} catch (error) {
						console.error('error', error.message);
						console.error('error', error);
						return new Response(
							JSON.stringify({ success: false, error: error.message }),
							{ status: 500, headers: { ...corsHeaders } }
						);
					}
				}

				if (pathname === '/api/block-user') {
					try {
						const { blocked_by, blocked_user } = await request.json();

						if (!blocked_by || !blocked_user) {
							return new Response('Blocked by and blocked user are required', { status: 400 });
						}

						const query = `
							INSERT INTO blocked_users (id, blocked_by, blocked_user)
							SELECT ?, u1.id, u2.id
							FROM users u1, users u2
							WHERE u1.username = ? AND u2.username = ?
							ON CONFLICT (blocked_by, blocked_user) DO NOTHING
							RETURNING *;
							`;

						const blockId = crypto.randomUUID(); // Generate a unique ID for the block record
						await env.DB.prepare(query).bind(blockId, blocked_by, blocked_user).run();

						return new Response(JSON.stringify({ success: true, blockId }), {
							headers: { ...corsHeaders },
						});
					} catch (error) {
						return new Response(JSON.stringify({ success: false, error: error.message }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}

				if (pathname === '/api/unblock-user') {
					try {
						const { blocked_by, blocked_user } = await request.json();

						// Validate input
						if (!blocked_by || !blocked_user) {
							return new Response('Blocked by and blocked user are required', { status: 400 });
						}

						// Query to delete the block record
						const query = `
							DELETE FROM blocked_users
							WHERE blocked_by = (SELECT id FROM users WHERE username = ?)
							AND blocked_user = (SELECT id FROM users WHERE username = ?);
							`;

						// Execute the query
						const result = await env.DB.prepare(query).bind(blocked_by, blocked_user).run();

						// Check if a record was deleted
						if (result.meta.changes === 0) {
							return new Response(JSON.stringify({ success: false, message: 'No block record found' }), {
								status: 404,
								headers: { ...corsHeaders },
							});
						}

						// Return success response
						return new Response(JSON.stringify({ success: true, message: 'User unblocked successfully' }), {
							headers: { ...corsHeaders },
						});
					} catch (error) {
						// Handle errors
						return new Response(JSON.stringify({ success: false, error: error.message }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}

				/********************************************************************************************************************************************************************* */

				if (pathname === '/api/ad/ban-user') {
					try {
						// Extract admin user data from headers
						console.log('request to ban was hit')
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const user_Id = user.id;
						const is_admin = await isAdmin(user_Id, env)
						console.log('request was from admin', is_admin)

						if (!is_admin) {
							console.error('unathorized user tried', user_Id)
							return new Response(
								JSON.stringify({ message: 'Error banning users' }),
								{ status: 500, headers: { ...corsHeaders } }
							);

						}

						// Parse the request body
						const requestBody = await request.json();
						const { userId, bannedUntil } = requestBody;
						console.log('uID', userId)
						console.log('banned until', bannedUntil)

						// Validate input
						if (!userId || !bannedUntil) {
							console.error('Missing required fields: userId or bannedUntil')
							return new Response(JSON.stringify({ success: false, error: 'Missing required fields: userId or bannedUntil' }), {
								status: 400,
								headers: { ...corsHeaders },
							});
						}

						// Validate bannedUntil timestamp
						const bannedUntilDate = new Date(bannedUntil);
						if (isNaN(bannedUntilDate.getTime())) {
							console.error('Invalid bannedUntil timestamp')
							return new Response(JSON.stringify({ success: false, error: 'Invalid bannedUntil timestamp' }), {
								status: 400,
								headers: { ...corsHeaders },
							});
						}

						// Update the user's banned status in the database
						const query = `
							UPDATE users
							SET is_banned = ?, banned_until = ?
							WHERE id = ?;
						`;
						const result = await env.DB.prepare(query)
							.bind(1, bannedUntil, userId)
							.run();

						// Check if the user was updated
						if (result.success) {
							console.log('User banned successfully')
							return new Response(JSON.stringify({ success: true, message: 'User banned successfully' }), {
								status: 200,
								headers: { ...corsHeaders },
							});
						} else {
							console.log('User not found or could not be banned')
							return new Response(JSON.stringify({ success: false, error: 'User not found or could not be banned' }), {
								status: 404,
								headers: { ...corsHeaders },
							});
						}
					} catch (error) {
						console.error('Error banning user:', error);
						return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}

				if (pathname === '/api/ad/unban-user') {
					try {
						// Extract admin user data from headers
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const user_Id = user.id;
						const is_admin = await isAdmin(user_Id, env)

						if (!is_admin) {
							console.error('unathorized user tried', userId)
							return new Response(
								JSON.stringify({ message: 'Error fetching users' }),
								{ status: 500, headers: { ...corsHeaders } }
							);

						}

						// Parse the request body
						const requestBody = await request.json();
						const { userId } = requestBody;

						// Validate input
						if (!userId) {
							return new Response(JSON.stringify({ success: false, error: 'Missing required field: userId' }), {
								status: 400,
								headers: { ...corsHeaders },
							});
						}

						// Update the user's banned status in the database
						const query = `
							UPDATE users
							SET is_banned = ?, banned_until = NULL
							WHERE id = ?;
						`;
						const result = await env.DB.prepare(query)
							.bind(0, userId) // Set is_banned to 0 (false) and banned_until to NULL
							.run();

						// Check if the user was updated
						if (result.success) {
							return new Response(JSON.stringify({ success: true, message: 'User unbanned successfully' }), {
								status: 200,
								headers: { ...corsHeaders },
							});
						} else {
							return new Response(JSON.stringify({ success: false, error: 'User not found or could not be unbanned' }), {
								status: 404,
								headers: { ...corsHeaders },
							});
						}
					} catch (error) {
						console.error('Error unbanning user:', error);
						return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}
				if (pathname === '/api/ad/toggle-product-visibility') {
					try {
						// Extract admin user data from headers
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;
						const is_admin = await isAdmin(userId, env)

						if (!is_admin) {
							console.error('unathorized user tried', userId)
							return new Response(
								JSON.stringify({ message: 'Error' }),
								{ status: 500, headers: { ...corsHeaders } }
							);

						}

						// Parse the request body
						const requestBody = await request.json();
						const { productId } = requestBody;

						// Validate input
						if (!productId) {
							return new Response(JSON.stringify({ success: false, error: 'Missing required field: productId' }), {
								status: 400,
								headers: { ...corsHeaders },
							});
						}

						// Fetch the current visibility status of the product
						const fetchQuery = `
							SELECT is_visible FROM products WHERE id = ?;
						`;
						const fetchResult = await env.DB.prepare(fetchQuery)
							.bind(productId)
							.first();

						if (!fetchResult) {
							return new Response(JSON.stringify({ success: false, error: 'Product not found' }), {
								status: 404,
								headers: { ...corsHeaders },
							});
						}

						// Toggle the visibility status
						const newVisibilityStatus = fetchResult.is_visible ? 0 : 1;

						// Update the product's visibility status in the database
						const updateQuery = `
							UPDATE products
							SET is_visible = ?
							WHERE id = ?;
						`;
						const updateResult = await env.DB.prepare(updateQuery)
							.bind(newVisibilityStatus, productId)
							.run();

						// Check if the product was updated
						if (updateResult.success) {
							return new Response(JSON.stringify({ success: true, message: 'Product visibility updated successfully', is_visible: newVisibilityStatus }), {
								status: 200,
								headers: { ...corsHeaders },
							});
						} else {
							return new Response(JSON.stringify({ success: false, error: 'Failed to update product visibility' }), {
								status: 500,
								headers: { ...corsHeaders },
							});
						}
					} catch (error) {
						console.error('Error toggling product visibility:', error);
						return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}

				if (pathname === '/api/ad/deleteProduct') {

					try {

						const { productId } = await request.json();

						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;
						const is_admin = await isAdmin(userId, env)

						if (!is_admin) {
							console.error('unathorized user tried', userId)
							return new Response(
								JSON.stringify({ message: 'Error' }),
								{ status: 500, headers: { ...corsHeaders } }
							);

						}

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



			} else {
				/********************************************************************************************************************************************************************************************************** */

				if (pathname === '/api/profile') {
					try {

						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						// Create a cache key based on the user ID
						const cacheKey = new Request(request.url, request);
						const cache = caches.default;

						// Try to get the response from the cache
						let cachedResponse = await cache.match(cacheKey);

						if (cachedResponse) {
							console.log('Serving profile from cache for user:', userId);
							return cachedResponse;
						}

						// If not in cache, fetch from the database
						const results = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
							.bind(userId)
							.first();

						if (!results) {
							return new Response('User not found', { status: 404, headers: { ...corsHeaders } });
						}

						// Create a response and cache it
						const response = new Response(JSON.stringify({ data: results }), {
							headers: {
								...corsHeaders,
								'Cache-Control': `public, max-age=${cacheTTL}`, // Cache for 10 minutes
							},
						});

						// Store the response in the cache
						await cache.put(cacheKey, response.clone());
						console.log('Caching profile response for user:', userId);

						return response;
					} catch (error) {
						console.error('Error fetching profile:', error.message);
						return new Response(
							JSON.stringify({ message: 'Error fetching profile', details: error.message }),
							{ status: 500, headers: { ...corsHeaders } }
						);
					}
				}


				if (pathname === '/api/followers') {
					try {
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						// Create a cache key based on the user ID
						const cacheKey = new Request(request.url, request);
						const cache = caches.default;

						// Try to get the response from the cache
						let cachedResponse = await cache.match(cacheKey);

						if (cachedResponse) {
							console.log('Serving followers from cache for user:', userId);
							return cachedResponse;
						}

						// Fetch followers
						const followersResults = await env.DB.prepare(`
							SELECT u.id, u.username, u.profile_picture
							FROM followers f
							JOIN users u ON f.follower_id = u.id
							WHERE f.followed_id = ?
						`).bind(userId).all();

						const response = new Response(JSON.stringify({
							followers: followersResults.results.map(row => {
								return {
									id: row.id,
									username: row.username,
									profile_picture: row.profile_picture
								};
							})
						}), {
							headers: {
								...corsHeaders,
								'Cache-Control': `public, max-age=${cacheTTL}`, // Cache for 10 minutes
							},
						});

						// Store the response in the cache
						await cache.put(cacheKey, response.clone());
						console.log('Caching followers response for user:', userId);

						return response;
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

						// Create a cache key based on the user ID
						const cacheKey = new Request(request.url, request);
						const cache = caches.default;

						// Try to get the response from the cache
						let cachedResponse = await cache.match(cacheKey);

						if (cachedResponse) {
							console.log('Serving followed users from cache for user:', userId);
							return cachedResponse;
						}

						// Fetch followed users
						const followedResults = await env.DB.prepare(`
							SELECT u.id, u.username, u.profile_picture
							FROM followers f
							JOIN users u ON f.followed_id = u.id
							WHERE f.follower_id = ?
						`).bind(userId).all();

						const response = new Response(JSON.stringify({
							followed: followedResults.results.map(row => {
								return {
									id: row.id,
									username: row.username,
									profile_picture: row.profile_picture
								};
							})
						}), {
							headers: {
								...corsHeaders,
								'Cache-Control': `public, max-age=${cacheTTL}`, // Cache for 10 minutes
							},
						});

						// Store the response in the cache
						await cache.put(cacheKey, response.clone());
						console.log('Caching followed users response for user:', userId);

						return response;
					} catch (error) {
						console.error('Error fetching followed users:', error);
						return new Response(JSON.stringify({ message: 'Error', details: error.message }), {
							status: 500, headers: { ...corsHeaders }
						});
					}
				}

				if (pathname === '/api/blocked-users') {
					try {
						// Get the current user from the headers
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						// Validate user ID
						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						// Fetch blocked users
						const blockedUsersResults = await env.DB.prepare(`
							SELECT u.id, u.username, u.profile_picture
							FROM blocked_users b
							JOIN users u ON b.blocked_user = u.id
							WHERE b.blocked_by = ?;
						`).bind(userId).all();

						// Format the response
						return new Response(JSON.stringify({
							blocked_users: blockedUsersResults.results.map(row => {
								return {
									id: row.id,
									username: row.username,
									profile_picture: row.profile_picture
								};
							})
						}), {
							headers: { ...corsHeaders },
						});
					} catch (error) {
						console.error('Error fetching blocked users:', error);
						return new Response(JSON.stringify({ message: 'Error', details: error.message }), {
							status: 500,
							headers: { ...corsHeaders }
						});
					}
				}

				if (pathname === '/api/blocked-by-users') {
					try {
						// Get the current user from the headers
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						// Validate user ID
						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						// Fetch blocked users
						const blockedUsersResults = await env.DB.prepare(`
							SELECT u.id, u.username, u.profile_picture
							FROM blocked_users b
							JOIN users u ON b.blocked_by = u.id
							WHERE b.blocked_user = ?;
						`).bind(userId).all();

						// Format the response
						return new Response(JSON.stringify({
							blocked_by: blockedUsersResults.results.map(row => {
								return {
									id: row.id,
									username: row.username,
									profile_picture: row.profile_picture
								};
							})
						}), {
							headers: { ...corsHeaders },
						});
					} catch (error) {
						console.error('Error fetching blocked users:', error);
						return new Response(JSON.stringify({ message: 'Error', details: error.message }), {
							status: 500,
							headers: { ...corsHeaders }
						});
					}
				}

				if (pathname === '/api/user') {
					const username = params.get('username'); // Extract the username slug
					console.log('username ff', username);

					// Validate the username parameter
					if (!username) {
						return new Response('Username not provided', { status: 404, headers: { ...corsHeaders } });
					}

					// Create a cache key based on the request URL
					const cacheKey = new Request(request.url, request);
					const cache = caches.default;

					// Try to get the response from the cache
					let cachedResponse = await cache.match(cacheKey);

					if (cachedResponse) {
						// If cached response exists, return it
						console.log('Serving from cache for username:', username);
						return cachedResponse;
					}

					// If not in cache, fetch from the database
					let results;
					try {
						results = await getUserByUsername(username);

						if (!results) {
							// If user not found, return a 404 response
							return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { ...corsHeaders } });
						}

						// Create a response and cache it
						const response = new Response(JSON.stringify(results), {
							status: 200,
							headers: {
								...corsHeaders,
								'Cache-Control': `public, max-age=${cacheTTL}`, // Cache for 10 minutes
							},
						});

						// Store the response in the cache
						cache.put(cacheKey, response.clone())

						console.log('Caching response for username:', username);
						return response;
					} catch (error) {
						// Handle database errors
						return new Response(JSON.stringify({ message: 'Database error', details: error.message }), { status: 500, headers: { ...corsHeaders } });
					}
				}


				if (pathname === '/api/liked-products') {
					try {
						// Extract user information from the request headers
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						// Query to fetch liked products
						const likedProductsResults = await env.DB.prepare(`
							SELECT p.id AS product_id, p.product_name AS product_name, p.user_id AS owner_id, u.username AS owner_username
							FROM product_likes pl
							JOIN products p ON pl.liked_product = p.id
							JOIN users u ON p.user_id = u.id
							WHERE pl.liked_by = ?
						`).bind(userId).all();

						// Return the results
						return new Response(JSON.stringify({ likedProducts: likedProductsResults.results }), {
							headers: { ...corsHeaders },
						});
					} catch (error) {
						console.error('Error fetching liked products:', error);
						return new Response(JSON.stringify({ message: 'Error', details: error.message }), {
							status: 500, headers: { ...corsHeaders },
						});
					}
				}

				if (pathname === '/api/threads') {
					try {
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						// Create a cache key based on the user ID
						const cacheKey = new Request(request.url, request);
						const cache = caches.default;

						// Try to get the response from the cache
						let cachedResponse = await cache.match(cacheKey);

						if (cachedResponse) {
							console.log('Serving threads from cache for user:', userId);
							return cachedResponse;
						}

						const query = `
							SELECT
								t.thread_id,
								t.sender,
								sender_user.username AS sender_name,
								sender_user.profile_picture AS sender_profile_picture,
								t.receiver,
								receiver_user.username AS receiver_name,
								receiver_user.profile_picture AS receiver_profile_picture,
								t.last_updated_at,
								m.content AS last_message,
								last_message_user.username AS last_message_owner,
								(SELECT COUNT(*) FROM messages WHERE thread_id = t.thread_id) AS message_count
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
							LEFT JOIN users last_message_user
								ON m.message_owner = last_message_user.id
							WHERE t.sender = ? OR t.receiver = ?
							ORDER BY t.last_updated_at DESC;
						`;

						const results = await env.DB.prepare(query).bind(userId, userId).all();

						const response = new Response(JSON.stringify(results.results), {
							headers: {
								...corsHeaders,
								'Cache-Control': `public, max-age=${cacheTTL}`, // Cache for 10 minutes
							},
						});

						// Store the response in the cache
						await cache.put(cacheKey, response.clone());
						console.log('Caching threads response for user:', userId);

						return response;
					} catch (error) {
						console.error('Error fetching threads:', error);
						return new Response('Internal Server Error', { status: 500, headers: { ...corsHeaders } });
					}
				}


				if (pathname === "/api/thread") {
					// Get all messages from thread with caching
					try {
						const threadId = params.get("id");
						if (!threadId) {
							console.error('No thread ID');
							return new Response('No thread ID', { status: 400, headers: { ...corsHeaders } });
						}

						let user = request.headers.get("X-User");
						if (!user) {
							console.error('No user');
							return new Response('No user', { status: 400, headers: { ...corsHeaders } });
						}

						user = JSON.parse(user);
						const userId = user.id;

						// Create a cache key based on thread ID
						const cacheKey = new Request(request.url, request);
						const cache = caches.default;
						let cachedResponse = await cache.match(cacheKey);

						if (cachedResponse) {
							console.log('Serving from cache for thread:', threadId);
							return cachedResponse;
						}

						// Verify if the user belongs to the thread
						const { results: thread } = await env.DB.prepare(`
							SELECT sender, receiver
							FROM threads
							WHERE thread_id = ?
						`).bind(threadId).all();

						if (!thread.length) {
							console.error('No threads');
							return new Response('No threads', { status: 400, headers: { ...corsHeaders } });
						}

						const { sender, receiver } = thread[0];
						if (userId !== sender && userId !== receiver) {
							console.error('Unauthorized');
							return new Response("Unauthorized", { status: 400, headers: { ...corsHeaders } });
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
							WHERE m.thread_id = ?
							ORDER BY m.created_at ASC
						`).bind(threadId).all();

						const response = new Response(JSON.stringify({ messages }), {
							headers: {
								...corsHeaders,
								'Cache-Control': `public, max-age=${cacheTTL}`, // Cache for 10 minutes
							},
						});

						await cache.put(cacheKey, response.clone());
						console.log('Caching response for thread:', threadId);

						return response;
					} catch (error) {
						console.error(error);
						console.error("Error:", error.message);
						return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders } });
					}
				}


				if (pathname === "/api/getProducts") {
					const cache = caches.default;
					const productId = params.get("product_id");
					const userId = params.get("user_id");

					let cacheKey = new Request(request.url); // Unique cache key per request
					let cachedResponse = await cache.match(cacheKey);

					if (cachedResponse) {
						console.log("Cache hit: Serving cached response");
						return cachedResponse;
					}

					let query = null;
					let results = null;

					try {
						if (productId) {
							console.log("Fetching product by ID:", productId);
							query = `
									SELECT
										p.id,
										p.product_name,
										p.product_price,
										p.product_description,
										p.product_category,
										p.product_url,
										u.id AS user_id,
										u.username,
										u.profile_picture,
										pi.id AS image_id,
										pi.image_url,
										COUNT(pl.id) AS like_count
									FROM
										products p
									JOIN
										users u ON p.user_id = u.id
									LEFT JOIN
										product_images pi ON pi.product_id = p.id
									LEFT JOIN
										product_likes pl ON pl.liked_product = p.id
									WHERE
										p.id = ?
									GROUP BY
										p.id, u.id, pi.id;
								`;

							let result = await env.DB.prepare(query).bind(productId).all();

							if (!result.results || result.results.length === 0) {
								console.error("Product not found");
								return new Response("Product not found", {
									status: 404,
									headers: { ...corsHeaders },
								});
							}

							results = {
								id: result.results[0].id,
								product_name: result.results[0].product_name,
								product_price: result.results[0].product_price,
								product_description: result.results[0].product_description,
								product_category: result.results[0].product_category,
								product_url: result.results[0].product_url,
								like_count: result.results[0].like_count,
								user_id: result.results[0].user_id,
								username: result.results[0].username,
								profile_picture: result.results[0].profile_picture,
								images: result.results
									.map(row => ({
										image_id: row.image_id,
										image_url: row.image_url,
									}))
									.filter(image => image.image_id), // Remove null images
							};
						} else if (userId) {
							console.log("Fetching products by user ID:", userId);
							query = `
									SELECT
										p.id,
										p.product_name,
										p.product_price,
										p.product_description,
										p.product_category,
										p.product_url,
										u.id AS user_id,
										u.username,
										u.profile_picture,
										COUNT(pl.id) AS like_count
									FROM
										products p
									JOIN
										users u ON p.user_id = u.id
									LEFT JOIN
										product_likes pl ON pl.liked_product = p.id
									WHERE
										p.user_id = ?
									GROUP BY
										p.id, u.id;
								`;
							results = await env.DB.prepare(query).bind(userId).all();
						} else {
							console.log("Fetching all products");
							query = `
									SELECT
										p.id,
										p.product_name,
										p.product_price,
										p.product_description,
										p.product_category,
										p.product_url,
										u.id AS user_id,
										u.username,
										u.profile_picture,
										COUNT(pl.id) AS like_count
									FROM
										products p
									JOIN
										users u ON p.user_id = u.id
									LEFT JOIN
										product_likes pl ON pl.liked_product = p.id
									GROUP BY
										p.id, u.id;
								`;
							results = await env.DB.prepare(query).all();
						}

						// Convert results to JSON response
						let response = new Response(JSON.stringify({ data: results, cacheKey: request.url }), {
							headers: { ...corsHeaders, "Cache-Control": `max-age=${cacheTTL}` },
						});

						// Store the response in cache
						await cache.put(cacheKey, response.clone());

						return response;
					} catch (error) {
						console.error("Database query error:", error);
						return new Response(JSON.stringify({ error: error.message }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}



				if (pathname === "/api/filter_products") {
					const cache = caches.default;
					const category = params.get("product_category");
					const minPrice = params.get("minPrice");
					const maxPrice = params.get("maxPrice");
					const minAge = params.get("minAge");
					const maxAge = params.get("maxAge");
					const ubicacion = params.get("ubicacion");

					// Generate a unique cache key based on the request URL and query parameters
					let cacheKey = new Request(request.url); // Unique cache key per request
					let cachedResponse = await cache.match(cacheKey);

					if (cachedResponse) {
						console.log("Cache hit: Serving cached response");
						return cachedResponse;
					}

					// Build query
					let query = `
					  SELECT products.id, product_name, product_price, product_description, product_category, product_url, users.username, users.age, users.ubicacion
					  FROM products
					  INNER JOIN users ON products.user_id = users.id
					  WHERE 1=1`;

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

					let results = null;

					try {
						// Execute the query
						const result = await env.DB.prepare(query).bind(...queryParams).all();
						if (!result.results || result.results.length === 0) {
							console.error("No products found matching filters");
							return new Response("No products found", { status: 404, headers: { ...corsHeaders } });
						}

						results = result.results.map(row => ({
							id: row.id,
							product_name: row.product_name,
							product_price: row.product_price,
							product_description: row.product_description,
							product_category: row.product_category,
							product_url: row.product_url,
							username: row.username,
							age: row.age,
							ubicacion: row.ubicacion,
						}));

						// Convert results to JSON response
						let response = new Response(JSON.stringify({ data: results, cacheKey: request.url }), {
							headers: { ...corsHeaders, "Cache-Control": `max-age=${cacheTTL}` },
						});

						// Store the response in cache
						await cache.put(cacheKey, response.clone());

						return response;

					} catch (error) {
						console.error("Database query error:", error);
						return new Response(JSON.stringify({ error: error.message }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}


				if (pathname === '/api/users') {
					// Fetch filter parameters
					const location = params.get('ubicacion');
					const minAge = params.get('minAge');
					const maxAge = params.get('maxAge');
					const verified = params.get('verified');

					// Create a cache key based on the request URL and filter parameters
					const cacheKey = new Request(request.url);
					const cache = caches.default;

					// Try to get the response from the cache
					let cachedResponse = await cache.match(cacheKey);

					if (cachedResponse) {
						// If cached response exists, return it with a debug header
						console.log('Serving from cache for filters:', { location, minAge, maxAge, verified });
						return cachedResponse
					}

					// If not in cache, fetch from the database
					try {
						// Build query
						let query = `
							SELECT id, username, email, profile_picture, profile_description, user_type, ubicacion, age, verified
							FROM users
							WHERE 1=1
						`;

						// Add filters if present
						const queryParams = [];
						if (location) {
							query += ' AND ubicacion = ?';
							queryParams.push(location);
						}
						if (minAge) {
							query += ' AND age >= ?';
							queryParams.push(minAge);
						}
						if (maxAge) {
							query += ' AND age <= ?';
							queryParams.push(maxAge);
						}
						if (verified) {
							query += ' AND verified = ?';
							queryParams.push(verified === 'true' ? 1 : 0); // Assuming `verified` is a boolean stored as 1/0 in the database
						}

						// Execute the query
						const results = await env.DB.prepare(query).bind(...queryParams).all();

						// Create a response and cache it
						const response = new Response(JSON.stringify({ data: results }), {
							headers: {
								...corsHeaders,
								'Cache-Control': `public, max-age=${cacheTTL}` // Add a debug header
							},
						});

						// Store the response in the cache
						await cache.put(cacheKey, response.clone());
						console.log('Caching response for filters:', { location, minAge, maxAge, verified });

						return response;
					} catch (error) {
						// Handle database errors
						console.error('Database error:', error.message);
						return new Response('Error querying database: ' + error.message, { status: 500, headers: { ...corsHeaders } });
					}
				}

				if (pathname === "/api/top-users") {
					const cache = caches.default;

					// Generate a unique cache key for this request
					let cacheKey = new Request(request.url); // Unique cache key per request
					let cachedResponse = await cache.match(cacheKey);

					if (cachedResponse) {
						console.log("Cache hit: Serving cached response");
						return cachedResponse;
					}

					try {
						// Query to get the 5 most followed users
						const mostFollowedQuery = `
						SELECT u.id, u.username, u.profile_picture, u.profile_description, COUNT(f.follower_id) AS follower_count
						FROM users u
						LEFT JOIN followers f ON u.id = f.followed_id
						GROUP BY u.id
						ORDER BY follower_count DESC
						LIMIT 5;
					  `;

						// Query to get the 5 newest users
						const newestUsersQuery = `
						SELECT id, username, profile_picture, profile_description, created_at
						FROM users
						ORDER BY created_at DESC
						LIMIT 5;
					  `;

						// Execute both queries
						const mostFollowedResults = await env.DB.prepare(mostFollowedQuery).all();
						const newestUsersResults = await env.DB.prepare(newestUsersQuery).all();

						// Combine the results into a single response
						const responseData = {
							most_followed: mostFollowedResults.results,
							newest_users: newestUsersResults.results,
						};

						// Convert results to JSON response
						let response = new Response(JSON.stringify(responseData), {
							headers: { ...corsHeaders, "Cache-Control": "max-age=300" }, // Cache for 5 minutes
						});

						// Store the response in cache
						await cache.put(cacheKey, response.clone());

						return response;
					} catch (error) {
						console.error("Database query error:", error);
						return new Response("Error querying database: " + error.message, { status: 500, headers: { ...corsHeaders } });
					}
				}

				/************************************************************************************************************************************************************************************************************ */

				if (pathname === '/api/ad/check-admin') {
					try {
						// Extract the user from the request headers
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;

						// Check if the user ID is provided
						if (!userId) {
							return new Response('User ID not provided', { status: 400 });
						}

						// Query the database to check if the user is an admin
						const results = await env.DB.prepare('SELECT is_admin FROM users WHERE id = ?')
							.bind(userId)
							.first();

						// If the user is not found, return a 404 error
						if (!results) {
							return new Response('User not found', { status: 404 });
						}

						// Check if the user is an admin
						const isAdmin = results.is_admin;

						// Return the response indicating whether the user is an admin
						return new Response(JSON.stringify({ is_admin: isAdmin }), {
							headers: {
								'Content-Type': 'application/json',
								...corsHeaders, // Assuming you have CORS headers defined
							},
						});
					} catch (error) {
						// Handle any errors that occur during the process
						console.error('Error checking admin status:', error.message);
						return new Response(
							JSON.stringify({ message: 'Error checking admin status', details: error.message }),
							{ status: 500, headers: { ...corsHeaders } }
						);
					}
				}


				if (pathname === '/api/ad/users') {
					try {

						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;
						const is_admin = await isAdmin(userId, env)

						if (!is_admin) {
							console.error('unathorized user tried', userId)
							return new Response(
								JSON.stringify({ message: 'Error fetching users' }),
								{ status: 500, headers: { ...corsHeaders } }
							);

						}

						const searchKeyword = params.get('search');
						// Fetch filter parameters
						const location = params.get('ubicacion');
						const minAge = params.get('minAge');
						const maxAge = params.get('maxAge');
						const verified = params.get('verified');
						const isBanned = params.get('isBanned');
						const bannedUntil = params.get('bannedUntil');
						const minReportedByUser = params.get('minReportedByUser');
						const maxReportedByUser = params.get('maxReportedByUser');
						const minReportedUser = params.get('minReportedUser');
						const maxReportedUser = params.get('maxReportedUser');
						const minBlockedBy = params.get('minBlockedBy');
						const maxBlockedBy = params.get('maxBlockedBy');
						const minBlockedUser = params.get('minBlockedUser');
						const maxBlockedUser = params.get('maxBlockedUser');
						const minThreadsCount = params.get('minThreadsCount');
						const maxThreadsCount = params.get('maxThreadsCount');
						const minProductsCount = params.get('minProductsCount');
						const maxProductsCount = params.get('maxProductsCount');


						// Fetch sorting parameters
						const sortBy = params.get('sortBy'); // Field to sort by (e.g., 'age', 'created_at', 'reported_by_user_count')
						const sortDirection = params.get('sortDirection'); // Sorting direction ('asc' or 'desc')

						// Build the base query
						let query = `
							SELECT
								users.id,
								users.username,
								users.email,
								users.profile_picture,
								users.profile_description,
								users.user_type,
								users.ubicacion,
								users.age,
								users.created_at,
								users.is_banned,
								users.banned_until,
								users.verified,
								COUNT(DISTINCT reported_by_user.id) AS reported_by_user_count, -- Count of reports where the user is the reporter
								COUNT(DISTINCT reported_user.id) AS reported_user_count, -- Count of reports where the user is the reported
								COUNT(DISTINCT blocked_by_counts.id) AS blocked_by_count, -- Count of times the user has been blocked by others
								COUNT(DISTINCT blocked_user_counts.id) AS blocked_user_count, -- Count of times the user has blocked others
								COUNT(DISTINCT products.id) AS product_count, -- Count of products for sellers
								COUNT(DISTINCT threads.thread_id) AS thread_count -- Count of threads where the user is the sender or receiver
							FROM users
							LEFT JOIN reports AS reported_by_user ON reported_by_user.reporter_id = users.id -- Reports where the user is the reporter
							LEFT JOIN reports AS reported_user ON reported_user.reported_id = users.id -- Reports where the user is the reported
							LEFT JOIN blocked_users AS blocked_by_counts ON blocked_by_counts.blocked_user = users.id -- Count of times the user has been blocked by others
							LEFT JOIN blocked_users AS blocked_user_counts ON blocked_user_counts.blocked_by = users.id -- Count of times the user has blocked others
							LEFT JOIN products ON products.user_id = users.id AND users.user_type = 'seller' -- Products for sellers
							LEFT JOIN threads ON threads.sender = users.id OR threads.receiver = users.id -- Threads where the user is the sender or receiver
							WHERE 1=1
						`;

						// Add non-aggregate filters to the WHERE clause
						const queryParams = [];

						if (searchKeyword) {
							query += ' AND users.profile_description LIKE ?';
							queryParams.push(`%${searchKeyword}%`);
						}

						if (location) {
							query += ' AND users.ubicacion = ?';
							queryParams.push(location);
						}
						if (minAge) {
							query += ' AND users.age >= ?';
							queryParams.push(minAge);
						}
						if (maxAge) {
							query += ' AND users.age <= ?';
							queryParams.push(maxAge);
						}
						if (verified) {
							query += ' AND users.verified = ?';
							queryParams.push(verified === 'true' ? 1 : 0);
						}
						if (isBanned) {
							query += ' AND users.is_banned = ?';
							queryParams.push(isBanned === '1' ? 1 : 0);
						}
						if (bannedUntil) {
							query += ' AND users.banned_until <= ?';
							queryParams.push(bannedUntil);
						}

						// Group by user ID to ensure correct aggregation
						query += ' GROUP BY users.id';

						// Add aggregate filters to the HAVING clause
						let havingClause = '';
						if (minReportedByUser) {
							havingClause += ' AND COUNT(DISTINCT reported_by_user.id) >= ?';
							queryParams.push(parseInt(minReportedByUser));
						}
						if (maxReportedByUser) {
							havingClause += ' AND COUNT(DISTINCT reported_by_user.id) <= ?';
							queryParams.push(parseInt(maxReportedByUser));
						}
						if (minReportedUser) {
							havingClause += ' AND COUNT(DISTINCT reported_user.id) >= ?';
							queryParams.push(parseInt(minReportedUser));
						}
						if (maxReportedUser) {
							havingClause += ' AND COUNT(DISTINCT reported_user.id) <= ?';
							queryParams.push(parseInt(maxReportedUser));
						}
						if (minBlockedBy) {
							havingClause += ' AND COUNT(DISTINCT blocked_by_counts.id) >= ?';
							queryParams.push(parseInt(minBlockedBy));
						}
						if (maxBlockedBy) {
							havingClause += ' AND COUNT(DISTINCT blocked_by_counts.id) <= ?';
							queryParams.push(parseInt(maxBlockedBy));
						}
						if (minBlockedUser) {
							havingClause += ' AND COUNT(DISTINCT blocked_user_counts.id) >= ?';
							queryParams.push(parseInt(minBlockedUser));
						}
						if (maxBlockedUser) {
							havingClause += ' AND COUNT(DISTINCT blocked_user_counts.id) <= ?';
							queryParams.push(parseInt(maxBlockedUser));
						}
						if (minThreadsCount) {
							havingClause += ' AND COUNT(DISTINCT threads.thread_id) >= ?';
							queryParams.push(parseInt(minThreadsCount));
						}
						if (maxThreadsCount) {
							havingClause += ' AND COUNT(DISTINCT threads.thread_id) <= ?';
							queryParams.push(parseInt(maxThreadsCount));
						}
						if (minProductsCount) {
							havingClause += ' AND COUNT(DISTINCT products.id) >= ?';
							queryParams.push(parseInt(minProductsCount));
						}
						if (maxProductsCount) {
							havingClause += ' AND COUNT(DISTINCT products.id) <= ?';
							queryParams.push(parseInt(maxProductsCount));
						}

						// Append the HAVING clause if there are aggregate filters
						if (havingClause) {
							query += ' HAVING 1=1' + havingClause;
						}

						// Add sorting
						if (sortBy && sortDirection) {
							const validSortFields = [
								'age', 'created_at', 'reported_by_user_count', 'reported_user_count',
								'blocked_by_count', 'blocked_user_count', 'product_count', 'thread_count'
							];
							if (validSortFields.includes(sortBy)) {
								if (sortBy === 'reported_by_user_count' || sortBy === 'reported_user_count' || sortBy === 'blocked_by_count' || sortBy === 'blocked_user_count'
									|| sortBy === 'product_count' || sortBy === 'thread_count') {

									console.log('hitt reported_by_user_count', sortBy)
									query += ` ORDER BY ${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
								} else {
									query += ` ORDER BY users.${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
								}

							}
						}

						// Execute the query
						const results = await env.DB.prepare(query).bind(...queryParams).all();

						// Return the response
						return new Response(JSON.stringify({ data: results, query }), {
							headers: {
								'Content-Type': 'application/json',
								...corsHeaders,
							},
						});
					} catch (error) {
						console.error('Error fetching users:', error.message);
						return new Response(
							JSON.stringify({ message: 'Error fetching users', details: error.message, query }),
							{ status: 500, headers: { ...corsHeaders } }
						);
					}
				}

				if (pathname === "/api/ad/products") {

					let user = request.headers.get('X-User');
					user = JSON.parse(user);
					const userId = user.id;
					const is_admin = await isAdmin(userId, env)

					if (!is_admin) {
						console.error('unathorized user tried', userId)
						return new Response(
							JSON.stringify({ message: 'Error fetching users' }),
							{ status: 500, headers: { ...corsHeaders } }
						);

					}

					const searchKeyword = params.get('search');
					const category = params.get("product_category");
					const minPrice = params.get("minPrice");
					const maxPrice = params.get("maxPrice");
					const minCreatedAt = params.get("minCreatedAt");
					const maxCreatedAt = params.get("maxCreatedAt");
					const minAge = params.get("minAge");
					const maxAge = params.get("maxAge");
					const ubicacion = params.get("ubicacion");
					const minReports = params.get("minReports");
					const maxReports = params.get("maxReports");
					const minLikes = params.get("minLikes");
					const maxLikes = params.get("maxLikes");
					const cntUser = params.get('cntUser')
					const sortBy = params.get('sortBy');
					const sortDirection = params.get('sortDirection');

					// Build query
					let query = `
						SELECT
							products.id,
							product_name,
							product_price,
							is_visible,
							products.created_at,
							product_description,
							product_category,
							product_url,
							users.username,
							users.age,
							users.cnt_user,
							users.profile_picture,
							users.ubicacion,
							COUNT(DISTINCT reports.id) AS report_count,
							COUNT(DISTINCT product_likes.id) AS like_count
						FROM
							products
						INNER JOIN
							users ON products.user_id = users.id
						LEFT JOIN
							reports ON products.id = reports.product_id
						LEFT JOIN
							product_likes ON products.id = product_likes.liked_product
						WHERE 1=1`;

					const queryParams = [];
					if (category) {
						query += " AND product_category = ?";
						queryParams.push(category);
					}
					if (minPrice) {
						query += " AND product_price >= ?";
						queryParams.push(parseInt(minPrice));
					}
					if (maxPrice) {
						query += " AND product_price <= ?";
						queryParams.push(parseInt(maxPrice));
					}
					if (minAge) {
						query += " AND users.age >= ?";
						queryParams.push(parseInt(minAge));
					}
					if (maxAge) {
						query += " AND users.age <= ?";
						queryParams.push(parseInt(maxAge));
					}
					if (ubicacion) {
						query += " AND users.ubicacion = ?";
						queryParams.push(ubicacion);
					}
					if (minCreatedAt) {
						query += " AND products.created_at >= ?";
						queryParams.push(minCreatedAt);
					}
					if (maxCreatedAt) {
						query += " AND products.created_at <= ?";
						queryParams.push(maxCreatedAt);
					}
					if (cntUser) {
						console.log('got cnt user')
						query += " AND users.cnt_user = ?";
						queryParams.push(parseInt(cntUser));
					}
					if (searchKeyword) {
						query += " AND (product_name LIKE ? OR product_description LIKE ?)";
						queryParams.push(`%${searchKeyword}%`, `%${searchKeyword}%`);
					}

					query += " GROUP BY products.id";

					if (minReports) {
						query += " HAVING report_count >= ?";
						queryParams.push(parseInt(minReports));
					}
					if (maxReports) {
						query += " AND report_count <= ?";
						queryParams.push(parseInt(maxReports));
					}
					if (minLikes) {
						query += " HAVING like_count >= ?";
						queryParams.push(parseInt(minLikes));
					}
					if (maxLikes) {
						query += " AND like_count <= ?";
						queryParams.push(parseInt(maxLikes));
					}

					if (sortBy && sortDirection) {
						const validSortFields = {
							'age': 'users.age',
							'created_at': 'products.created_at',
							'report_count': 'report_count',
							'like_count': 'like_count',
							'ubicacion': 'users.ubicacion',
							'product_category': 'products.product_category',
							'product_price': 'products.product_price'
						};

						if (validSortFields[sortBy]) {
							query += ` ORDER BY ${validSortFields[sortBy]} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
						}
					}

					// Pagination
					const page = parseInt(params.get('page')) || 1;
					const limit = parseInt(params.get('limit')) || 10;
					const offset = (page - 1) * limit;
					query += ` LIMIT ? OFFSET ?`;
					queryParams.push(limit, offset);

					try {
						// Execute the query
						const results = await env.DB.prepare(query).bind(...queryParams).all();

						// Convert results to JSON response
						let response = new Response(JSON.stringify({ data: results }), {
							headers: { ...corsHeaders, },
						});

						return response;

					} catch (error) {
						console.error("Database query error:", error);
						return new Response(JSON.stringify({ error: error.message }), {
							status: 500,
							headers: { ...corsHeaders },
						});
					}
				}
				if (pathname === '/api/ad/threads') {
					try {
						// Extract admin user data from headers
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;
						const is_admin = await isAdmin(userId, env);

						// Ensure the requester is an admin
						if (!is_admin) {
							console.error('Unauthorized user tried:', userId);
							return new Response(
								JSON.stringify({ message: 'Unauthorized: Admin access required' }),
								{ status: 403, headers: { ...corsHeaders } }
							);
						}

						// Fetch filter parameters
						const searchKeyword = params.get('search');
						const senderLocation = params.get('senderLocation');
						const receiverLocation = params.get('receiverLocation');
						const minAge = params.get('minAge');
						const maxAge = params.get('maxAge');
						const userType = params.get('userType');
						const minMessageCount = params.get('minMessageCount');
						const maxMessageCount = params.get('maxMessageCount');
						const cntUser = params.get('cntUser')


						// Fetch sorting parameters
						const sortBy = params.get('sortBy'); // Field to sort by (e.g., 'created_at', 'last_updated_at', 'message_count')
						const sortDirection = params.get('sortDirection'); // Sorting direction ('asc' or 'desc')
						const filterUserId = params.get('userId');

						let query = `
							SELECT
								threads.thread_id,
								threads.thread_title,
								threads.sender,
								threads.receiver,
								threads.created_at,
								threads.last_updated_at,
								sender_user.username AS sender_username,
								sender_user.profile_picture AS sender_profile_picture,
								sender_user.ubicacion AS sender_location,
								sender_user.age AS sender_age,
								sender_user.user_type AS sender_user_type,
								receiver_user.username AS receiver_username,
								receiver_user.profile_picture AS receiver_profile_picture,
								receiver_user.ubicacion AS receiver_location,
								receiver_user.age AS receiver_age,
								receiver_user.user_type AS receiver_user_type,
								COUNT(messages.message_id) AS message_count
							FROM threads
							LEFT JOIN users AS sender_user ON threads.sender = sender_user.id
							LEFT JOIN users AS receiver_user ON threads.receiver = receiver_user.id
							LEFT JOIN messages ON threads.thread_id = messages.thread_id
							WHERE 1=1
						`;


						// Add non-aggregate filters to the WHERE clause
						const queryParams = [];

						if (searchKeyword) {
							query += ' AND threads.thread_title LIKE ?';
							queryParams.push(`%${searchKeyword}%`);
						}

						if (senderLocation) {
							query += ' AND sender_user.ubicacion = ?';
							queryParams.push(senderLocation);
						}

						if (receiverLocation) {
							query += ' AND receiver_user.ubicacion = ?';
							queryParams.push(receiverLocation);
						}

						if (minAge) {
							query += ' AND (sender_user.age >= ? OR receiver_user.age >= ?)';
							queryParams.push(minAge, minAge);
						}

						if (maxAge) {
							query += ' AND (sender_user.age <= ? OR receiver_user.age <= ?)';
							queryParams.push(maxAge, maxAge);
						}

						if (userType) {
							query += ' AND (sender_user.user_type = ? OR receiver_user.user_type = ?)';
							queryParams.push(userType, userType);
						}

						if (filterUserId) {
							query += ' AND (threads.sender = ? OR threads.receiver = ?)';
							queryParams.push(filterUserId, filterUserId);
						}

						if (cntUser) {
							//console.log('got cnt user')
							//query += " AND users.cnt_user = ?";
							query += ' AND (sender_user.cnt_user = ? OR receiver_user.cnt_user = ?)';
							queryParams.push(cntUser, cntUser);

						}

						// Group by thread ID to ensure correct aggregation
						query += ' GROUP BY threads.thread_id';

						// Add aggregate filters to the HAVING clause
						let havingClause = '';
						if (minMessageCount) {
							havingClause += ' AND COUNT(messages.message_id) >= ?';
							queryParams.push(parseInt(minMessageCount));
						}

						if (maxMessageCount) {
							havingClause += ' AND COUNT(messages.message_id) <= ?';
							queryParams.push(parseInt(maxMessageCount));
						}

						// Append the HAVING clause if there are aggregate filters
						if (havingClause) {
							query += ' HAVING 1=1' + havingClause;
						}

						// Add sorting
						if (sortBy && sortDirection) {
							const validSortFields = [
								'created_at', 'last_updated_at', 'message_count'
							];
							if (validSortFields.includes(sortBy)) {
								if (sortBy === 'created_at') {
									query += ` ORDER BY threads.${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
								} else {
									query += ` ORDER BY ${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
								}

							}
						}

						// Execute the query
						const results = await env.DB.prepare(query).bind(...queryParams).all();

						// Return the response
						return new Response(JSON.stringify({ data: results, query }), {
							headers: {
								'Content-Type': 'application/json',
								...corsHeaders,
							},
						});
					} catch (error) {
						console.error('Error fetching threads:', error.message);
						return new Response(
							JSON.stringify({ message: 'Error fetching threads', details: error.message, query }),
							{ status: 500, headers: { ...corsHeaders } }
						);
					}
				}

				if (pathname === '/api/ad/user/threads') {
					try {
						let user = request.headers.get('X-User');
						const userId = params.get('userId');

						user = JSON.parse(user);
						const adminId = user.id;
						const is_admin = await isAdmin(adminId, env);

						// Ensure the requester is an admin
						if (!is_admin) {
							console.error('Unauthorized user tried:', adminId);
							return new Response(
								JSON.stringify({ message: 'Unauthorized: Admin access required' }),
								{ status: 403, headers: { ...corsHeaders } }
							);
						}

						const query = `
							SELECT
								t.thread_id,
								t.sender,
								sender_user.username AS sender_name,
								sender_user.profile_picture AS sender_profile_picture,
								t.receiver,
								receiver_user.username AS receiver_name,
								receiver_user.profile_picture AS receiver_profile_picture,
								t.last_updated_at,
								m.content AS last_message,
								last_message_user.username AS last_message_owner,
								(SELECT COUNT(*) FROM messages WHERE thread_id = t.thread_id) AS message_count
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
							LEFT JOIN users last_message_user
								ON m.message_owner = last_message_user.id
							WHERE t.sender = ? OR t.receiver = ?
							ORDER BY t.last_updated_at DESC;
						`;

						const results = await env.DB.prepare(query).bind(userId, userId).all();

						const response = new Response(JSON.stringify(results.results), {
							headers: {
								...corsHeaders,
							},
						});

						return response;
					} catch (error) {
						console.error('Error fetching threads:', error);
						return new Response('Internal Server Error', { status: 500, headers: { ...corsHeaders } });
					}
				}


				if (pathname === "/api/ad/thread") {

					try {

						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;
						const is_admin = await isAdmin(userId, env);

						// Ensure the requester is an admin
						if (!is_admin) {
							console.error('Unauthorized user tried:', userId);
							return new Response(
								JSON.stringify({ message: 'Unauthorized ' }),
								{ status: 403, headers: { ...corsHeaders } }
							);
						}

						const threadId = params.get("id");
						if (!threadId) {
							console.error('No thread ID');
							return new Response('No thread ID', { status: 400, headers: { ...corsHeaders } });
						}

						// Verify if the user belongs to the thread
						const { results: thread } = await env.DB.prepare(`
							SELECT sender, receiver
							FROM threads
							WHERE thread_id = ?
						`).bind(threadId).all();

						if (!thread.length) {
							console.error('No threads');
							return new Response('No threads', { status: 400, headers: { ...corsHeaders } });
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
							WHERE m.thread_id = ?
							ORDER BY m.created_at ASC
						`).bind(threadId).all();

						const response = new Response(JSON.stringify({ messages }), {
							headers: {
								...corsHeaders, // Cache for 10 minutes
							},
						});

						return response;
					} catch (error) {
						console.error(error);
						console.error("Error:", error.message);
						return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders } });
					}
				}

				if (pathname === '/api/ad/stats') {
					try {
						// Authenticate the user
						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;
						const is_admin = await isAdmin(userId, env);

						const cache = caches.default;
						let cacheKey = new Request(request.url); // Unique cache key per request
						let cachedResponse = await cache.match(cacheKey);

						if (cachedResponse) {
							console.log("Cache hit: Serving cached response");
							return cachedResponse;
						}

						if (!is_admin) {
							console.error('Unauthorized user tried to access stats:', userId);
							return new Response(
								JSON.stringify({ message: 'Unauthorized access' }),
								{ status: 403, headers: { ...corsHeaders } }
							);
						}

						// Query to count total users, products, threads, and reports
						const query = `
							SELECT
								(SELECT COUNT(*) FROM users) AS total_users,
								(SELECT COUNT(*) FROM products) AS total_products,
								(SELECT COUNT(*) FROM threads) AS total_threads,
								(SELECT COUNT(*) FROM reports) AS total_reports
						`;

						// Execute the query
						const result = await env.DB.prepare(query).first();

						// Return the response
						let response= new Response(JSON.stringify({ data: result }), {
							headers: {
								'Content-Type': 'application/json',
								...corsHeaders,
							},
						});

						await cache.put(cacheKey, response.clone());

						return response;

					} catch (error) {
						console.error('Error fetching stats:', error.message);
						return new Response(
							JSON.stringify({ message: 'Error fetching stats', details: error.message }),
							{ status: 500, headers: { ...corsHeaders } }
						);
					}
				}

				if (pathname === '/api/ad/cnt-users') {
					try {

						let user = request.headers.get('X-User');
						user = JSON.parse(user);
						const userId = user.id;
						const is_admin = await isAdmin(userId, env)

						if (!is_admin) {
							console.error('unathorized user tried', userId)
							return new Response(
								JSON.stringify({ message: 'Error fetching users' }),
								{ status: 500, headers: { ...corsHeaders } }
							);

						}

						const searchKeyword = params.get('search');
						// Fetch filter parameters
						const location = params.get('ubicacion');
						const minAge = params.get('minAge');
						const maxAge = params.get('maxAge');
						const verified = params.get('verified');

						const minThreadsCount = params.get('minThreadsCount');
						const maxThreadsCount = params.get('maxThreadsCount');
						const minProductsCount = params.get('minProductsCount');
						const maxProductsCount = params.get('maxProductsCount');


						// Fetch sorting parameters
						const sortBy = params.get('sortBy'); // Field to sort by (e.g., 'age', 'created_at', 'reported_by_user_count')
						const sortDirection = params.get('sortDirection'); // Sorting direction ('asc' or 'desc')

						// Build the base query
						let query = `
							SELECT
								users.id,
								users.username,
								users.email,
								users.profile_picture,
								users.profile_description,
								users.user_type,
								users.ubicacion,
								users.age,
								users.created_at,
								users.verified,
								COUNT(DISTINCT products.id) AS product_count, -- Count of products for sellers
								COUNT(DISTINCT threads.thread_id) AS thread_count -- Count of threads where the user is the sender or receiver
							FROM users
							LEFT JOIN products ON products.user_id = users.id AND users.user_type = 'seller' -- Products for sellers
							LEFT JOIN threads ON threads.sender = users.id OR threads.receiver = users.id -- Threads where the user is the sender or receiver
							WHERE 1=1
							AND users.cnt_user = 1
						`;

						// Add non-aggregate filters to the WHERE clause
						const queryParams = [];

						if (searchKeyword) {
							query += ' AND users.profile_description LIKE ?';
							queryParams.push(`%${searchKeyword}%`);
						}

						if (location) {
							query += ' AND users.ubicacion = ?';
							queryParams.push(location);
						}
						if (minAge) {
							query += ' AND users.age >= ?';
							queryParams.push(minAge);
						}
						if (maxAge) {
							query += ' AND users.age <= ?';
							queryParams.push(maxAge);
						}
						if (verified) {
							query += ' AND users.verified = ?';
							queryParams.push(verified === 'true' ? 1 : 0);
						}

						// Group by user ID to ensure correct aggregation
						query += ' GROUP BY users.id';

						// Add aggregate filters to the HAVING clause
						let havingClause = '';

						if (minThreadsCount) {
							havingClause += ' AND COUNT(DISTINCT threads.thread_id) >= ?';
							queryParams.push(parseInt(minThreadsCount));
						}
						if (maxThreadsCount) {
							havingClause += ' AND COUNT(DISTINCT threads.thread_id) <= ?';
							queryParams.push(parseInt(maxThreadsCount));
						}
						if (minProductsCount) {
							havingClause += ' AND COUNT(DISTINCT products.id) >= ?';
							queryParams.push(parseInt(minProductsCount));
						}
						if (maxProductsCount) {
							havingClause += ' AND COUNT(DISTINCT products.id) <= ?';
							queryParams.push(parseInt(maxProductsCount));
						}

						// Append the HAVING clause if there are aggregate filters
						if (havingClause) {
							query += ' HAVING 1=1' + havingClause;
						}

						// Add sorting
						if (sortBy && sortDirection) {
							const validSortFields = [
								'age', 'created_at', 'product_count', 'thread_count'
							];
							if (validSortFields.includes(sortBy)) {
								if (sortBy === 'product_count' || sortBy === 'thread_count') {

									console.log('hitt reported_by_user_count', sortBy)
									query += ` ORDER BY ${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
								} else {
									query += ` ORDER BY users.${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
								}

							}
						}

						// Execute the query
						const results = await env.DB.prepare(query).bind(...queryParams).all();

						// Return the response
						return new Response(JSON.stringify({ data: results, query }), {
							headers: {
								'Content-Type': 'application/json',
								...corsHeaders,
							},
						});
					} catch (error) {
						console.error('Error fetching users:', error.message);
						return new Response(
							JSON.stringify({ message: 'Error fetching users', details: error.message, query }),
							{ status: 500, headers: { ...corsHeaders } }
						);
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

