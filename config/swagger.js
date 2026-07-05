const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Disan Alam Portfolio API',
      version: '1.0.0',
      description: 'API documentation for Disan Alam Full-Stack Portfolio. This API handles dynamic content like Blogs, Projects, Skills, and Contact form submissions.',
      contact: {
        name: 'Disan Alam',
        url: 'https://disanalam.me',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
      {
        url: 'https://disanalam.me',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], // Points to the route files containing JSDoc Swagger comments
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
