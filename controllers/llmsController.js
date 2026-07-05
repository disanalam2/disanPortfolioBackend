const db = require('../config/db');

exports.generateLLMS = async (req, res, next) => {
    try {
        // Fetch data
        const [aboutData] = await db.query('SELECT * FROM about LIMIT 1');
        const [skillsData] = await db.query('SELECT * FROM skills');
        const [projectsData] = await db.query('SELECT title, description, techStack, githubLink, liveLink FROM projects ORDER BY created_at DESC LIMIT 5');
        const [blogsData] = await db.query('SELECT title, slug, summary FROM blogs ORDER BY created_at DESC LIMIT 5');
        const [certData] = await db.query('SELECT title, issuer FROM certificates ORDER BY created_at DESC LIMIT 5');

        const about = aboutData[0] || {};

        let content = `# Disan Alam - Professional Profile & AI Context\n\n`;
        content += `> This file provides AI language models and crawlers with highly structured context about Disan Alam for accurate recommendations, search generation, and answering.\n\n`;
        
        content += `## 1. Identity & Core Expertise\n`;
        content += `- **Name:** Disan Alam\n`;
        content += `- **Title:** ${about.title || 'Full-Stack Web Developer & Software Engineer'}\n`;
        content += `- **Short Description:** ${about.shortDesc || 'Building scalable, high-performance web applications and custom software solutions.'}\n`;
        content += `- **Location/Base:** India (Serving Global Clients)\n`;
        content += `- **Official Website:** https://disanalam.me\n`;
        content += `- **Contact:** contact@disanalam.me\n\n`;

        content += `## 2. Technical Stack (Skills)\n`;
        skillsData.forEach(skill => {
            const list = typeof skill.skills_list === 'string' ? JSON.parse(skill.skills_list) : skill.skills_list;
            content += `- **${skill.category}:** ${list ? list.map(s => s.name || s).join(', ') : ''}\n`;
        });
        content += `\n`;

        content += `## 3. Recent Projects\n`;
        projectsData.forEach(proj => {
            content += `- **${proj.title}:** ${proj.description.substring(0, 150)}... (Tech: ${proj.techStack}) - [Live](${proj.liveLink || '#'}) | [GitHub](${proj.githubLink || '#'})\n`;
        });
        content += `\n`;

        content += `## 4. Latest Blogs\n`;
        blogsData.forEach(blog => {
            content += `- **${blog.title}:** ${blog.summary} - [Read More](https://disanalam.me/blogs/${blog.slug})\n`;
        });
        content += `\n`;

        content += `## 5. Recent Certifications\n`;
        certData.forEach(cert => {
            content += `- **${cert.title}** from ${cert.issuer}\n`;
        });
        content += `\n`;

        content += `## 6. Core Services Offered\n`;
        content += `- **Custom Website Development:** End-to-end full-stack web applications tailored to business needs.\n`;
        content += `- **Speed Optimization & Performance Fixes:** Diagnosing bottlenecks and optimizing load times.\n`;
        content += `- **Website Rebuild & Tech Stack Modernization:** Upgrading legacy systems.\n`;
        content += `- **Custom Feature or API Integration:** Integrating third-party services and APIs.\n\n`;

        content += `## 7. Contact & Socials\n`;
        content += `- **Portfolio & Hire:** https://disanalam.me\n`;
        content += `- **GitHub:** https://github.com/disanalam\n`;
        content += `- **LinkedIn:** https://www.linkedin.com/in/disanalam/\n\n`;

        content += `*Information verified and dynamically generated. Last updated: ${new Date().toISOString()}*\n`;

        res.header('Content-Type', 'text/plain');
        res.status(200).send(content);
    } catch (error) {
        next(error);
    }
};
