const db = require('./db');

const syncDatabase = async () => {
    console.log('🔄 Checking database schema and synchronizing...');
    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS about (
              id INT AUTO_INCREMENT PRIMARY KEY,
              photo LONGTEXT,
              title VARCHAR(255) NOT NULL,
              shortDesc TEXT,
              whoIAm TEXT,
              whatIDo TEXT,
              howIWork TEXT,
              updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
            
            `CREATE TABLE IF NOT EXISTS certificates (
              id INT AUTO_INCREMENT PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              issuer VARCHAR(255) NOT NULL,
              issue_date VARCHAR(100) DEFAULT NULL,
              description TEXT,
              href VARCHAR(255) DEFAULT NULL,
              image LONGTEXT,
              created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
            
            `CREATE TABLE IF NOT EXISTS experience (
              id INT AUTO_INCREMENT PRIMARY KEY,
              role VARCHAR(255) NOT NULL,
              company VARCHAR(255) NOT NULL,
              period VARCHAR(100) DEFAULT NULL,
              details TEXT,
              created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
            
            `CREATE TABLE IF NOT EXISTS messages (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) DEFAULT NULL,
              phone VARCHAR(255) DEFAULT NULL,
              preference VARCHAR(50) NOT NULL,
              subject VARCHAR(255) DEFAULT NULL,
              websiteUrl VARCHAR(255) DEFAULT NULL,
              message TEXT NOT NULL,
              created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
            
            `CREATE TABLE IF NOT EXISTS projects (
              id INT AUTO_INCREMENT PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              description TEXT NOT NULL,
              techStack VARCHAR(255) DEFAULT NULL,
              githubLink VARCHAR(255) DEFAULT NULL,
              liveLink VARCHAR(255) DEFAULT NULL,
              created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
              media LONGTEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
            
            `CREATE TABLE IF NOT EXISTS skills (
              id INT AUTO_INCREMENT PRIMARY KEY,
              category VARCHAR(255) NOT NULL,
              skills_list JSON DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
            
            `CREATE TABLE IF NOT EXISTS education (
              id INT AUTO_INCREMENT PRIMARY KEY,
              degree VARCHAR(255) NOT NULL,
              institution VARCHAR(255) NOT NULL,
              period VARCHAR(100) DEFAULT NULL,
              details TEXT,
              created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,

            `CREATE TABLE IF NOT EXISTS blogs (
              id INT AUTO_INCREMENT PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              slug VARCHAR(255) NOT NULL UNIQUE,
              summary TEXT,
              content LONGTEXT NOT NULL,
              thumbnail LONGTEXT,
              views INT DEFAULT 0,
              scheduledFor DATETIME DEFAULT NULL,
              created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        ];

        // Ensure tables exist
        for (let query of queries) {
            await db.execute(query);
        }
        console.log('✅ All tables verified or created successfully!');

        // Check for 'problemFaced' column in 'projects' table
        const [columns] = await db.query("SHOW COLUMNS FROM projects LIKE 'problemFaced'");
        if (columns.length === 0) {
            console.log('🔄 Adding missing column: problemFaced to projects table...');
            await db.execute("ALTER TABLE projects ADD COLUMN problemFaced TEXT DEFAULT NULL;");
            console.log('✅ Column problemFaced added successfully!');
        } else {
            console.log('✅ Column problemFaced already exists.');
        }

        // Check for 'resume_link' column in 'about' table
        const [aboutColumns] = await db.query("SHOW COLUMNS FROM about LIKE 'resume_link'");
        if (aboutColumns.length === 0) {
            console.log('🔄 Adding missing column: resume_link to about table...');
            await db.execute("ALTER TABLE about ADD COLUMN resume_link TEXT DEFAULT NULL;");
            console.log('✅ Column resume_link added successfully!');
        } else {
            console.log('✅ Column resume_link already exists in about table.');
        }

        // Check for 'read_time' column in 'blogs' table
        const [blogColumns] = await db.query("SHOW COLUMNS FROM blogs LIKE 'read_time'");
        if (blogColumns.length === 0) {
            console.log('🔄 Adding missing column: read_time to blogs table...');
            await db.execute("ALTER TABLE blogs ADD COLUMN read_time INT DEFAULT 1;");
            console.log('✅ Column read_time added successfully!');
        } else {
            console.log('✅ Column read_time already exists in blogs table.');
        }

        // Check for 'githubLinkBackend' column in 'projects' table
        const [projColumns] = await db.query("SHOW COLUMNS FROM projects LIKE 'githubLinkBackend'");
        if (projColumns.length === 0) {
            console.log('🔄 Adding missing column: githubLinkBackend to projects table...');
            await db.execute("ALTER TABLE projects ADD COLUMN githubLinkBackend VARCHAR(255) DEFAULT NULL;");
            console.log('✅ Column githubLinkBackend added successfully!');
        } else {
            console.log('✅ Column githubLinkBackend already exists.');
        }

        // Check for 'subject' column in 'messages' table
        const [msgSubjectColumns] = await db.query("SHOW COLUMNS FROM messages LIKE 'subject'");
        if (msgSubjectColumns.length === 0) {
            console.log('🔄 Adding missing column: subject to messages table...');
            await db.execute("ALTER TABLE messages ADD COLUMN subject VARCHAR(255) DEFAULT NULL;");
            console.log('✅ Column subject added successfully!');
        }

        // Check for 'websiteUrl' column in 'messages' table
        const [msgWebsiteColumns] = await db.query("SHOW COLUMNS FROM messages LIKE 'websiteUrl'");
        if (msgWebsiteColumns.length === 0) {
            console.log('🔄 Adding missing column: websiteUrl to messages table...');
            await db.execute("ALTER TABLE messages ADD COLUMN websiteUrl VARCHAR(255) DEFAULT NULL;");
            console.log('✅ Column websiteUrl added successfully!');
        }

        // Ensure preference and phone columns are large enough and not restricted to ENUM
        try {
            await db.execute("ALTER TABLE messages MODIFY COLUMN preference VARCHAR(50) NOT NULL;");
            await db.execute("ALTER TABLE messages MODIFY COLUMN phone VARCHAR(255) DEFAULT NULL;");
            console.log('✅ Columns preference and phone types verified/updated in messages table.');
        } catch (e) {
            console.log('⚠️ Could not modify preference/phone columns (maybe table does not have data or syntax issue):', e.message);
        }

        // --- SEO Fields Auto-Enhancement ---
        // Check for 'seo_title' and 'seo_description' in 'projects'
        const [projSeoTitle] = await db.query("SHOW COLUMNS FROM projects LIKE 'seo_title'");
        if (projSeoTitle.length === 0) {
            console.log('🔄 Adding missing column: seo_title and seo_description to projects table...');
            await db.execute("ALTER TABLE projects ADD COLUMN seo_title VARCHAR(255) DEFAULT NULL;");
            await db.execute("ALTER TABLE projects ADD COLUMN seo_description TEXT DEFAULT NULL;");
            console.log('✅ Columns seo_title and seo_description added to projects successfully!');
        }

        // Check for 'seo_title' and 'seo_description' in 'blogs'
        const [blogSeoTitle] = await db.query("SHOW COLUMNS FROM blogs LIKE 'seo_title'");
        if (blogSeoTitle.length === 0) {
            console.log('🔄 Adding missing column: seo_title and seo_description to blogs table...');
            await db.execute("ALTER TABLE blogs ADD COLUMN seo_title VARCHAR(255) DEFAULT NULL;");
            await db.execute("ALTER TABLE blogs ADD COLUMN seo_description TEXT DEFAULT NULL;");
            console.log('✅ Columns seo_title and seo_description added to blogs successfully!');
        }

        // Check for 'views' in 'blogs'
        const [blogViews] = await db.query("SHOW COLUMNS FROM blogs LIKE 'views'");
        if (blogViews.length === 0) {
            console.log('🔄 Adding missing column: views to blogs table...');
            await db.execute("ALTER TABLE blogs ADD COLUMN views INT DEFAULT 0;");
            console.log('✅ Column views added to blogs successfully!');
        }

        // Check for 'scheduledFor' in 'blogs'
        const [blogScheduledFor] = await db.query("SHOW COLUMNS FROM blogs LIKE 'scheduledFor'");
        if (blogScheduledFor.length === 0) {
            console.log('🔄 Adding missing column: scheduledFor to blogs table...');
            await db.execute("ALTER TABLE blogs ADD COLUMN scheduledFor DATETIME DEFAULT NULL;");
            console.log('✅ Column scheduledFor added to blogs successfully!');
        }

    } catch (error) {
        console.error('❌ Database Sync Error:', error.message);
    }
};

module.exports = syncDatabase;
