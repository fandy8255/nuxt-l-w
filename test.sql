CREATE TABLE users (
	id TEXT PRIMARY KEY,
	username TEXT,
	email TEXT NOT NULL UNIQUE,
	profile_picture TEXT ,
	profile_description TEXT,
	user_type TEXT NOT NULL,
	ubicacion TEXT NOT NULL,
	age INTEGER NOT NULL,
	verified INTEGER DEFAULT 0,
	is_admin BOOLEAN DEFAULT 0,
	is_banned BOOLEAN DEFAULT 0,
	cnt_user BOOLEAN DEFAULT 0,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	banned_until TIMESTAMP
);
