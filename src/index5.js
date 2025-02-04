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
			}
		}catch(err){
			console.error('error', err)
		}
	}
}
