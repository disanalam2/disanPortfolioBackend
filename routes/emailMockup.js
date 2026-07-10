const express = require('express');
const router = express.Router();

router.get('/:name', (req, res) => {
    const businessName = decodeURIComponent(req.params.name);
    
    // We are generating a beautiful HTML template.
    // The Thum.io or Microlink API will screenshot this page and embed it in the email.
    
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${businessName} - New Website Mockup</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    text-align: center;
                }
                .container {
                    max-width: 800px;
                    padding: 40px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                h1 {
                    font-size: 3.5rem;
                    margin-bottom: 20px;
                    background: linear-gradient(to right, #60a5fa, #3b82f6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                p {
                    font-size: 1.2rem;
                    color: #94a3b8;
                    margin-bottom: 40px;
                    line-height: 1.6;
                }
                .btn {
                    display: inline-block;
                    padding: 16px 32px;
                    background: #3b82f6;
                    color: white;
                    text-decoration: none;
                    border-radius: 9999px;
                    font-weight: bold;
                    font-size: 1.1rem;
                    transition: all 0.3s ease;
                }
                .btn:hover {
                    background: #2563eb;
                    transform: translateY(-2px);
                }
                .badge {
                    display: inline-block;
                    padding: 8px 16px;
                    background: rgba(59, 130, 246, 0.1);
                    color: #60a5fa;
                    border-radius: 9999px;
                    font-size: 0.9rem;
                    font-weight: bold;
                    margin-bottom: 20px;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="badge">🚀 Future Website Preview</div>
                <h1>${businessName}</h1>
                <p>Imagine your business with a stunning, lightning-fast website that converts visitors into loyal customers.<br>This is just a glimpse of what we can build for you.</p>
                <a href="#" class="btn">Explore Services</a>
            </div>
        </body>
        </html>
    `;
    
    res.send(html);
});

module.exports = router;
