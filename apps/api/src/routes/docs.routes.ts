import { Router, type Request, type Response } from "express";

export const docsRouter = Router();

// Relax CSP specifically for the interactive Swagger UI route
docsRouter.use((_req: Request, res: Response, next) => {
  res.removeHeader("Content-Security-Policy");
  next();
});

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "IncidentPulse API",
    version: "0.1.0",
    description:
      "Enterprise-grade incident response, on-call alert dispatch, and real-time mitigation engine. Open-source alternative to PagerDuty/Opsgenie.",
    contact: {
      name: "IncidentPulse Core Team",
      url: "https://github.com/amy9273/incident-pulse",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
    {
      url: "https://api.incidentpulse.io",
      description: "Production API Gateway",
    },
  ],
  tags: [
    { name: "Health", description: "Liveness and Readiness probe endpoints" },
    { name: "Auth", description: "JWT session authentication & user profiles" },
    {
      name: "Webhooks",
      description: "Alert ingestion and automated fingerprint deduplication",
    },
    {
      name: "Incidents",
      description: "Incident management, 1-tap triage, and audit trails",
    },
    {
      name: "Schedules",
      description: "On-call schedules, shifts, and active responder resolution",
    },
    {
      name: "Services",
      description: "Monitored service registry and webhook key management",
    },
    {
      name: "Escalation Policies",
      description: "Multi-tier escalation rules and delay timers",
    },
  ],
  paths: {
    "/health/live": {
      get: {
        tags: ["Health"],
        summary: "Process Liveness Probe",
        description:
          "Returns 200 if the Node.js event loop and HTTP server are responsive (Invariant #3).",
        responses: {
          "200": {
            description: "Process is live",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: { type: "string", format: "date-time" },
                    uptime: { type: "number", example: 42.15 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/health/ready": {
      get: {
        tags: ["Health"],
        summary: "Backing Services Readiness Probe",
        description:
          "Verifies database pool connectivity and Redis ping to ensure readiness for traffic.",
        responses: {
          "200": {
            description: "All backing services healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    checks: {
                      type: "object",
                      properties: {
                        postgres: { type: "string", example: "healthy" },
                        redis: { type: "string", example: "healthy" },
                      },
                    },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "503": { description: "One or more dependencies are unavailable" },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "User Authentication",
        description:
          "Authenticate with email and password to receive a JWT session token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "alex@incidentpulse.io",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    example: "Password123!",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Authentication successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: {
                      type: "string",
                      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string", example: "Alex Rivera" },
                        email: {
                          type: "string",
                          example: "alex@incidentpulse.io",
                        },
                        role: { type: "string", example: "ENGINEER" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current Authenticated Profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Current user profile" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/webhooks/services/{serviceKey}": {
      post: {
        tags: ["Webhooks"],
        summary: "Ingest Monitoring Alert via Service Key",
        description:
          "Zero-loss webhook endpoint for external monitoring systems (Prometheus, Datadog, AWS CloudWatch). Automatically hashes alert fingerprint and deduplicates against open incidents within < 200ms (Invariant #2).",
        parameters: [
          {
            name: "serviceKey",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Service integration secret key",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: {
                    type: "string",
                    example: "Critical Redis Latency Spike (>500ms)",
                  },
                  summary: {
                    type: "string",
                    example:
                      "Redis command execution p99 latency exceeded 520ms in cluster primary.",
                  },
                  urgency: {
                    type: "string",
                    enum: ["LOW", "HIGH"],
                    default: "HIGH",
                  },
                  payload: {
                    type: "object",
                    example: {
                      cluster: "redis-primary",
                      p99Ms: 520,
                      thresholdMs: 100,
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "New incident created and escalation state machine queued",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "created" },
                    incidentId: { type: "string", format: "uuid" },
                    fingerprint: { type: "string" },
                    alertCount: { type: "number", example: 1 },
                  },
                },
              },
            },
          },
          "200": {
            description:
              "Duplicate alert detected; incremented occurrence counter on existing open incident (Invariant #2)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "deduplicated" },
                    incidentId: { type: "string", format: "uuid" },
                    alertCount: { type: "number", example: 2 },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid service integration key" },
        },
      },
    },
    "/api/v1/incidents": {
      get: {
        tags: ["Incidents"],
        summary: "List Incidents",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["TRIGGERED", "ACKNOWLEDGED", "RESOLVED"],
            },
          },
          { name: "serviceId", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "List of incidents matching query filters" },
        },
      },
    },
    "/api/v1/incidents/{id}": {
      get: {
        tags: ["Incidents"],
        summary: "Get Incident Details",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Incident details with full chronological audit logs",
          },
          "404": { description: "Incident not found" },
        },
      },
    },
    "/api/v1/incidents/{id}/acknowledge": {
      post: {
        tags: ["Incidents"],
        summary: "1-Tap Acknowledge Incident",
        description:
          "Transitions incident state to ACKNOWLEDGED and immediately cancels pending BullMQ escalation delayed jobs (Invariant #1).",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Incident acknowledged and escalation timer cancelled",
          },
          "400": {
            description: "Incident cannot be acknowledged from current state",
          },
        },
      },
    },
    "/api/v1/incidents/{id}/resolve": {
      post: {
        tags: ["Incidents"],
        summary: "Resolve Incident",
        description:
          "Marks incident as RESOLVED, records resolution notes, and calculates MTTA and MTTR metrics.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  note: {
                    type: "string",
                    example:
                      "Flushed blocked slow queries and increased Redis connection pool limit.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Incident resolved successfully" },
        },
      },
    },
    "/api/v1/schedules": {
      get: {
        tags: ["Schedules"],
        summary: "List On-Call Schedules",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of schedules with active on-call responders",
          },
        },
      },
    },
    "/api/v1/services": {
      get: {
        tags: ["Services"],
        summary: "List Monitored Services",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description:
              "List of registered services, health status, and linked escalation policies",
          },
        },
      },
    },
    "/api/v1/escalation-policies": {
      get: {
        tags: ["Escalation Policies"],
        summary: "List Escalation Policies",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description:
              "List of multi-tier escalation policies and dispatch rules",
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JSON Web Token bearer header",
      },
    },
  },
};

// Return raw OpenAPI 3.0 specification as JSON
docsRouter.get("/openapi.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.json(openApiSpec);
});

// Render self-contained interactive Swagger UI
docsRouter.get("/", (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IncidentPulse API Reference & Interactive Explorer</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .header-bar {
      background: #111827;
      border-bottom: 1px solid #1f2937;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-bar h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge {
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nav-links a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
      margin-left: 16px;
      transition: color 0.15s ease;
    }
    .nav-links a:hover {
      color: #38bdf8;
    }
    /* Swagger UI Dark Ergonomics */
    .swagger-ui {
      filter: invert(88%) hue-rotate(180deg);
    }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div class="header-bar">
    <h1>
      <span>IncidentPulse API Explorer</span>
      <span class="badge">v0.1.0</span>
    </h1>
    <div class="nav-links">
      <a href="/api/v1/docs/openapi.json" target="_blank">Raw OpenAPI JSON</a>
      <a href="/health/ready" target="_blank">Health Status</a>
      <a href="https://github.com/amy9273/incident-pulse" target="_blank">GitHub Repository</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/v1/docs/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});
