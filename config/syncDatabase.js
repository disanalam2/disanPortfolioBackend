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
              phone VARCHAR(20) DEFAULT NULL,
              preference ENUM('email', 'whatsapp') NOT NULL,
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

    } catch (error) {
        console.error('❌ Database Sync Error:', error.message);
    }
};

module.exports = syncDatabase;
