CREATE TABLE followers (
    id UUID PRIMARY KEY,
    follower_id TEXT NOT NULL,
    followed_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (follower_id, followed_id)
);


/*
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
*/
-- Create messages table
/*
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
);*/

/*
CREATE TABLE threads (
    thread_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender UUID NOT NULL REFERENCES users(user_id),
    receiver UUID NOT NULL REFERENCES users(user_id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(thread_id),
    message_owner UUID NOT NULL REFERENCES users(user_id),
    receiver UUID NOT NULL REFERENCES users(user_id),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/


-- Insert values into the 'products' table
/*
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 25000, 'description','panties','product-1' , "awfaefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 25000, 'description','panties','product-1' , "awfaefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 25000, 'description','panties','product-1' , "awfaefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 69000, 'description','panties','product-1' , "awfaefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 25000, 'description','tangas','product-1' , "atnwfaefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 35000, 'description','tangas','product-1' , "atnwfaefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 25000, 'description','panties','product-1' , "atnwfaefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 25000, 'description','panties','product-1' , "atnwfaefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('contenido', 120000, 'description','contenido','contenido-1' , "awfasrefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 25000, 'description','panties','product-1' , "awfasrefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 25000, 'description','panties','product-1' , "awfasrefgse");
INSERT INTO products (product_name,product_price,product_description,product_category, product_url, user_id) VALUES ('panties-1', 25000, 'description','panties','product-1' , "awfasrefgse");
*/
