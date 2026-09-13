import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Learning Management System API',
      version: '1.0.0',
      description: `
# LMS API Documentation

Public API documentation for tenant owners and end-users.
Only high-level auth methods are shown — internal implementation details are intentionally omitted.

## Authentication (public-facing)

- **Owner Session** Required for dashboard/owner-only routes. If you're using the dashboard UI, this is handled automatically.

- **API Key (Project Owner)** Programmatic/server access. Send API keys in the Authorization header as:  
  \`Authorization: Bearer sk_live_xxxxxxxxxxxxx\`.

- **End User (JWT)** End-users authenticate using JWTs in the Authorization header:  
  \`Authorization: Bearer <jwt_token>\`.

- **Delegated Auth (External Systems)** For delegated projects, send an external user id header (e.g. \`X-User-Id\`) together with a valid project API key.

## Reading route auth

Routes list one or more auth methods; you only need one of the listed methods.
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        OwnerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Session',
          description:
            'Owner session for dashboard/admin access. If using the dashboard UI, the session is handled automatically.',
        },
        ApiKeyAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description:
            'Project API key. Use header: Authorization: Bearer sk_live_xxxxxxxxxxxxx',
        },
        ManagedUserAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT token for end-users. Use header: Authorization: Bearer <jwt_token>',
        },
        DelegatedAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-User-Id',
          description:
            'External user id for delegated authentication. Typically used together with a project API key.',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            status: { type: 'number', example: 200 },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'My Learning Platform' },
            slug: {
              type: 'string',
              example: 'my-learning-platform-1234567890',
            },
            publishableKey: { type: 'string', example: 'pk_live_xxxxxxxx' },
            authMode: { type: 'string', enum: ['MANAGED', 'DELEGATED'] },
            branding: { type: 'object', nullable: true },
            allowedOrigins: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Production Key' },
            createdAt: { type: 'string', format: 'date-time' },
            lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        EndUser: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email', nullable: true },
            externalId: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['ACTIVE', 'BANNED'] },
            createdAt: { type: 'string', format: 'date-time' },
            managedUser: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            delegatedUser: {
              type: 'object',
              nullable: true,
              properties: {
                metadata: { type: 'object' },
                lastSeenAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        WebhookConfig: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri', nullable: true },
            secret: { type: 'string', nullable: true },
            events: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'enrollment.created',
                'lesson.completed',
                'quiz.attempt_completed',
                'course.completed',
                'video.processed',
                'video.failed',
              ],
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Error message' },
            data: { type: 'object' },
          },
        },
      },
    },
    tags: [
      { name: 'Projects', description: 'Project/Tenant management' },
      { name: 'API Keys', description: 'API key management for projects' },
      { name: 'Webhooks', description: 'Webhook configuration' },
      {
        name: 'Payment Settings',
        description: 'Payment gateway configuration',
      },
      { name: 'Coupons', description: 'Coupon and discount management' },
      { name: 'End Users', description: 'End user management' },
      { name: 'Courses', description: 'Course management' },
      { name: 'Modules', description: 'Course module management' },
      { name: 'Lessons', description: 'Lesson management' },
      { name: 'Enrollments', description: 'Student enrollment management' },
      { name: 'Progress', description: 'Learning progress tracking' },
      { name: 'Quizzes', description: 'Quiz management' },
      { name: 'Authentication', description: 'End-user authentication' },
      { name: 'Storefront', description: 'Public storefront endpoints' },
      { name: 'Commerce', description: 'Payment and purchase endpoints' },
      { name: 'Analytics', description: 'Project analytics' },
      { name: 'AI', description: 'AI-powered features' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
}

const swaggerSpec = swaggerJsdoc(options)

export const setupSwagger = (app: Express) => {
  // Serve swagger docs
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'LMS API Documentation',
    }),
  )

  // Serve raw JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })
}

export { swaggerSpec }
