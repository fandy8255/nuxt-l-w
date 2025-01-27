-- Create the 'users' table
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- unique ID for each seller
    username TEXT,         -- username for each seller
    email TEXT NOT NULL UNIQUE,
	profile_picture TEXT ,
	profile_description TEXT,
	user_type TEXT NOT NULL,
	ubicacion TEXT NOT NULL,
    age INTEGER NOT NULL,
	verified INTEGER DEFAULT 0
);

-- Create the 'products' table
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Auto-incrementing unique ID for each product
    product_name TEXT NOT NULL,           -- Name of the product
    product_price INTEGER NOT NULL,
    product_description TEXT ,
    product_category TEXT NOT NULL,
    product_url TEXT NOT NULL,            -- URL of the product
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

-- Insert values into the 'sellers' table
INSERT INTO users (id ,username, email, profile_picture, profile_description, user_type,ubicacion, age) VALUES ("awfaefgse", 'ana23','ana1@gmail.com', 'profile_picture', 'profile_description','seller','Colombia', 23 );


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
