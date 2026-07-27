import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Attendance Management System API',
      version: '1.0.0',
      description: 'API Documentation with OAuth2 Password Flow',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        OAuth2Password: {
          type: 'oauth2',
          flows: {
            password: {
              tokenUrl: '/api/auth/login',
              scopes: {},
            },
          },
        },
      },
    },
  },
  // 💡 Windows/Linux പാത്തുകൾ കൃത്യമായി മാച്ച് ആകാൻ src/**/*.ts നൽകുക
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);