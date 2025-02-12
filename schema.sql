
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



CREATE TABLE products (
    id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    product_price INTEGER NOT NULL,
    product_description TEXT ,
    product_category TEXT NOT NULL,
    product_url TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	is_visible BOOLEAN DEFAULT 1,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);


CREATE TABLE product_likes (
    id TEXT PRIMARY KEY ,
    liked_product TEXT NOT NULL,
    liked_by TEXT NOT NULL,
    liked_product_belongs_to TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (liked_product) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (liked_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (liked_product_belongs_to) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (liked_product, liked_by)
);


CREATE TABLE followers (
    id UUID PRIMARY KEY,
    follower_id TEXT NOT NULL,
    followed_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (follower_id, followed_id)
);


CREATE TABLE threads (
    thread_id UUID PRIMARY KEY ,
	thread_title TEXT NOT NULL,
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    created_at TIMESTAMP ,
    last_updated_at TIMESTAMP ,
    FOREIGN KEY (sender) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE messages (
    message_id UUID PRIMARY KEY ,
    thread_id UUID NOT NULL,
    message_owner TEXT NOT NULL,
    receiver TEXT NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP ,
    FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
    FOREIGN KEY (message_owner) REFERENCES users(id),
    FOREIGN KEY (receiver) REFERENCES users(id)
);


CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reported_id TEXT NOT NULL,
    report_reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(product_id, reporter_id)
);


CREATE TABLE blocked_users (
    id TEXT PRIMARY KEY,
    blocked_by TEXT NOT NULL,
    blocked_user TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_user) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (blocked_by, blocked_user)
);
