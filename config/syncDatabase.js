const db = require('./db');

const syncDatabase = async () => {
    console.log('🔄 Checking database schema and synchronizing...');
    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS email_inbox (
              id INT AUTO_INCREMENT PRIMARY KEY,
              account_email VARCHAR(255) NOT NULL,
              sender_email VARCHAR(255) NOT NULL,
              subject TEXT,
              body TEXT,
              is_read TINYINT(1) DEFAULT 0,
              received_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,

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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,

            `CREATE TABLE IF NOT EXISTS email_leads (
              id INT AUTO_INCREMENT PRIMARY KEY,
              uuid VARCHAR(36) UNIQUE,
              business_name VARCHAR(255) NOT NULL,
              niche VARCHAR(255),
              address TEXT,
              email VARCHAR(255),
              phone VARCHAR(255),
              website TEXT,
              source VARCHAR(255),
              email_draft TEXT,
              lead_type VARCHAR(50) DEFAULT 'no_website',
              website_issues TEXT,
              status VARCHAR(50) DEFAULT 'pending',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              opened TINYINT(1) DEFAULT 0,
              opened_at DATETIME,
              screenshot_url TEXT,
              ab_version VARCHAR(10) DEFAULT 'A',
              is_unsubscribed TINYINT(1) DEFAULT 0,
              clicked TINYINT(1) DEFAULT 0,
              clicked_at DATETIME,
              conversion_type VARCHAR(100),
              follow_up_1_draft TEXT,
              follow_up_2_draft TEXT,
              follow_up_step INT DEFAULT 0,
              last_contacted_at DATETIME,
              timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
              social_media_context TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,

            `CREATE TABLE IF NOT EXISTS email_search_state (
              id INT PRIMARY KEY,
              current_location_index INT DEFAULT 0,
              current_phase INT DEFAULT 1,
              is_active TINYINT(1) DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,

            `CREATE TABLE IF NOT EXISTS email_accounts (
              id INT AUTO_INCREMENT PRIMARY KEY,
              email VARCHAR(255) NOT NULL UNIQUE,
              password VARCHAR(255) NOT NULL,
              host VARCHAR(255) DEFAULT 'smtp.hostinger.com',
              port INT DEFAULT 465,
              daily_sent_count INT DEFAULT 0,
              last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
              is_active TINYINT(1) DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,

            `CREATE TABLE IF NOT EXISTS email_jobs (
              id INT AUTO_INCREMENT PRIMARY KEY,
              type VARCHAR(100) NOT NULL,
              payload TEXT,
              status VARCHAR(50) DEFAULT 'pending',
              retries INT DEFAULT 0,
              locked_until DATETIME,
              error TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,

            `CREATE TABLE IF NOT EXISTS page_views (
              id INT AUTO_INCREMENT PRIMARY KEY,
              page_path VARCHAR(255) NOT NULL,
              referrer VARCHAR(255),
              user_agent TEXT,
              ip_address VARCHAR(255),
              session_id VARCHAR(255),
              device_type VARCHAR(50),
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

        // --- Email Leads v2 Auto-Enhancement ---
        const [emailLeadsCol] = await db.query("SHOW COLUMNS FROM email_leads LIKE 'follow_up_1_draft'");
        if (emailLeadsCol.length === 0) {
            console.log('🔄 Adding missing columns for V2 to email_leads table...');
            await db.execute("ALTER TABLE email_leads ADD COLUMN follow_up_1_draft TEXT;");
            await db.execute("ALTER TABLE email_leads ADD COLUMN follow_up_2_draft TEXT;");
            await db.execute("ALTER TABLE email_leads ADD COLUMN follow_up_step INT DEFAULT 0;");
            await db.execute("ALTER TABLE email_leads ADD COLUMN last_contacted_at DATETIME;");
            await db.execute("ALTER TABLE email_leads ADD COLUMN timezone VARCHAR(100) DEFAULT 'Asia/Kolkata';");
            await db.execute("ALTER TABLE email_leads ADD COLUMN social_media_context TEXT;");
            console.log('✅ Columns for V2 added to email_leads successfully!');
        }

        // --- Email Leads v3 Auto-Enhancement (UUID) ---
        const [uuidCol] = await db.query("SHOW COLUMNS FROM email_leads LIKE 'uuid'");
        if (uuidCol.length === 0) {
            console.log('🔄 Adding missing column: uuid to email_leads table...');
            await db.execute("ALTER TABLE email_leads ADD COLUMN uuid VARCHAR(36) UNIQUE;");
            // Fill existing rows with UUID
            const leads = await db.query("SELECT id FROM email_leads WHERE uuid IS NULL");
            const crypto = require('crypto');
            for (let i = 0; i < leads[0].length; i++) {
                await db.execute("UPDATE email_leads SET uuid = ? WHERE id = ?", [crypto.randomUUID(), leads[0][i].id]);
            }
            console.log('✅ Column uuid added and populated successfully!');
        }

        // --- Email Leads Smart Inbox Enhancement (last_reply_text) ---
        const [replyCol] = await db.query("SHOW COLUMNS FROM email_leads LIKE 'last_reply_text'");
        if (replyCol.length === 0) {
            console.log('🔄 Adding missing column: last_reply_text to email_leads table...');
            await db.execute("ALTER TABLE email_leads ADD COLUMN last_reply_text TEXT;");
            console.log('✅ Column last_reply_text added to email_leads successfully!');
        }

        // --- Email Leads Omni-Channel Enhancement (intent_analysis) ---
        const [intentCol] = await db.query("SHOW COLUMNS FROM email_leads LIKE 'intent_analysis'");
        if (intentCol.length === 0) {
            console.log('🔄 Adding missing column: intent_analysis to email_leads table...');
            await db.execute("ALTER TABLE email_leads ADD COLUMN intent_analysis TEXT;");
            console.log('✅ Column intent_analysis added to email_leads successfully!');
        }

        // --- Email Accounts Soft Delete Enhancement ---
        const [emailAccDeletedCol] = await db.query("SHOW COLUMNS FROM email_accounts LIKE 'deleted'");
        if (emailAccDeletedCol.length === 0) {
            console.log('🔄 Adding missing column: deleted to email_accounts table...');
            await db.execute("ALTER TABLE email_accounts ADD COLUMN deleted TINYINT(1) DEFAULT 0;");
            console.log('✅ Column deleted added to email_accounts successfully!');
        }

        try {
            await db.query(`ALTER TABLE email_leads ADD COLUMN is_hot TINYINT(1) DEFAULT 0;`);
        } catch (e) {
            // Ignore error if column already exists
        }
        
        try {
            await db.query(`ALTER TABLE email_leads ADD COLUMN priority_score INT DEFAULT 0;`);
        } catch (e) {
            // Ignore error if column already exists
        }

        // Initialize email search state if not exists
        const [state] = await db.query('SELECT * FROM email_search_state WHERE id = 1');
        if (state.length === 0) {
            await db.execute('INSERT INTO email_search_state (id, current_location_index, current_phase, is_active) VALUES (1, 0, 1, 1)');
        } else {
            // Check for is_active column
            const [isActiveCol] = await db.query("SHOW COLUMNS FROM email_search_state LIKE 'is_active'");
            if (isActiveCol.length === 0) {
                console.log('🔄 Adding missing column: is_active to email_search_state table...');
                await db.execute("ALTER TABLE email_search_state ADD COLUMN is_active TINYINT(1) DEFAULT 1;");
                console.log('✅ Column is_active added to email_search_state successfully!');
            }
        }

    } catch (error) {
        console.error('❌ Database Sync Error:', error.message);
    }
};

module.exports = syncDatabase;
