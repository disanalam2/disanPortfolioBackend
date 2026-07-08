# Disan Alam Portfolio - Backend API

This is the highly secure and scalable Express.js backend for Disan Alam's portfolio and CMS engine. It serves RESTful APIs, manages real-time socket connections, handles MySQL database operations, and automates AI/LLM structured data delivery.

## 🚀 Key Features

- **Real-Time Engine (Socket.IO)**: Pushes instantaneous updates to the frontend for Blogs, Contacts, and other entities, ensuring the admin and public UI are perfectly synchronized without polling.
- **Dynamic AI / SEO Generation**: 
  - **`/api/llms`**: Automatically queries the database to generate a markdown `llms.txt` file tailored for AI bots (ChatGPT, Perplexity).
  - **`/api/sitemap`**: Dynamically generates `sitemap.xml` based on the latest blogs and updated timestamps of projects.
- **Robust Authentication**: JWT (JSON Web Token) based admin authentication with strict route protection middlewares.
- **Automated Email Notifications**: Integrates `nodemailer` to instantly notify the admin of new leads, and automatically sends a dynamically generated professional response to the client based on the requested service (e.g., Performance Audit vs. Custom Build).
- **Secure File Handling**: Uses `multer` for secure image uploads and handles conversions flawlessly.
- **MySQL Database Architecture**: Uses `mysql2` with connection pooling for maximum efficiency, and features an auto-synchronization script to handle database schemas.

## 🛠 Tech Stack

- **Server Environment**: `Node.js` + `Express.js`
- **Database**: `MySQL` (via `mysql2/promise`)
- **Real-Time**: `Socket.IO`
- **Security**: `bcryptjs` (Password hashing), `jsonwebtoken` (Auth), `cors`
- **File Uploads**: `multer`
- **Email Server**: `nodemailer` (SMTP config)
- **Validation**: `express-validator`

## 📂 Project Structure

- `server.js` — Application entry point, Express setup, and Socket.IO initialization.
- `config/db.js` — Database connection pooling setup.
- `controllers/` — Core business logic, handling HTTP requests and database queries (e.g., `blogController`, `contactController`).
- `routes/` — Express route definitions mapped to their respective controllers.
- `middleware/` — Security checks (`authMiddleware`) and upload handling (`multer.js`).

## 🏃‍♂️ Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```


2. **Start the Server**:
   ```bash
   # Development (requires nodemon)
   npm run dev

   # Production
   npm start
   ```

## 📡 API Endpoints (Highlights)

- `GET /api/llms` - AI Context File
- `GET /api/sitemap` - Dynamic XML Sitemap
- `POST /api/contact` - Sends a message and triggers real-time socket + auto-email.
- `GET /api/blogs` - Fetches published and scheduled blogs.

*Designed and Developed by Disan Alam.*
