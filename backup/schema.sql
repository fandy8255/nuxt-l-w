
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- unique ID for each seller
    username TEXT,         -- username for each seller
    email TEXT NOT NULL UNIQUE,
	profile_picture TEXT ,
	profile_description TEXT,
	user_type TEXT NOT NULL,
	ubicacion TEXT NOT NULL,
    age INTEGER NOT NULL,
	verified INTEGER DEFAULT 0,
	is_admin BOOLEAN DEFAULT 0,
	is_banned BOOLEAN DEFAULT 0,
	banned_until TIMESTAMP
);

-- Create the 'products' table
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,           -- Name of the product
    product_price INTEGER NOT NULL,
    product_description TEXT ,
    product_category TEXT NOT NULL,
    product_url TEXT NOT NULL,
	is_visible BOOLEAN DEFAULT 1,            -- URL of the product
    user_id INTEGER NOT NULL,           -- Foreign key referencing the seller ID
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique ID for each image
    product_id INTEGER,          -- Foreign key referencing the product
    image_url TEXT NOT NULL,              -- URL of the image
    is_primary BOOLEAN DEFAULT FALSE,     -- Flag for the primary image
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_likes (
    id TEXT PRIMARY KEY ,        -- Unique identifier for each like record
    liked_product TEXT NOT NULL,                         -- The product that is liked
    liked_by TEXT NOT NULL,                              -- The user who liked the product
    liked_product_belongs_to TEXT NOT NULL,             -- The user who owns the product
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,      -- Timestamp of when the like action occurred
    FOREIGN KEY (liked_product) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (liked_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (liked_product_belongs_to) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (liked_product, liked_by)                    -- Ensure no duplicate likes for the same product by the same user
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
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP ,
    last_updated_at TIMESTAMP ,
    FOREIGN KEY (sender) REFERENCES users(id),
    FOREIGN KEY (receiver) REFERENCES users(id)
);

-- Create messages table

CREATE TABLE messages (
    message_id UUID PRIMARY KEY ,
    thread_id UUID NOT NULL,
    message_owner TEXT NOT NULL,
    receiver TEXT NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP ,
    FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
    FOREIGN KEY (message_owner) REFERENCES users(id),
    FOREIGN KEY (receiver) REFERENCES users(id)
);


