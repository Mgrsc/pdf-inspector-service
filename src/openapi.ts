export function openApiDocument(version: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "PDF Inspector Service",
      version,
      description:
        "Authenticated HTTP API wrapping @firecrawl/pdf-inspector for PDF classification and Markdown extraction.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "API key as Bearer token",
        },
        apiKeyHeader: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                requestId: { type: "string" },
                details: {},
              },
              required: ["code", "message", "requestId"],
            },
          },
          required: ["error"],
        },
        ClassifyResult: {
          type: "object",
          properties: {
            pdfType: {
              type: "string",
              enum: ["TextBased", "Scanned", "ImageBased", "Mixed"],
            },
            pageCount: { type: "integer" },
            pagesNeedingOcr: {
              type: "array",
              items: { type: "integer" },
              description: "0-indexed page numbers",
            },
            confidence: { type: "number" },
            requestId: { type: "string" },
          },
        },
        ProcessResult: {
          type: "object",
          properties: {
            pdfType: { type: "string" },
            markdown: { type: "string", nullable: true },
            pageCount: { type: "integer" },
            processingTimeMs: { type: "integer" },
            pagesNeedingOcr: { type: "array", items: { type: "integer" } },
            confidence: { type: "number" },
            title: { type: "string", nullable: true },
            isComplexLayout: { type: "boolean" },
            pagesWithTables: { type: "array", items: { type: "integer" } },
            pagesWithColumns: { type: "array", items: { type: "integer" } },
            hasEncodingIssues: { type: "boolean" },
            requestId: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
    paths: {
      "/health": {
        get: {
          security: [],
          summary: "Liveness probe",
          responses: {
            "200": { description: "OK" },
          },
        },
      },
      "/ready": {
        get: {
          security: [],
          summary: "Readiness probe",
          responses: {
            "200": { description: "Ready" },
          },
        },
      },
      "/v1/classify": {
        post: {
          summary: "Classify PDF type",
          requestBody: {
            required: true,
            content: {
              "application/pdf": { schema: { type: "string", format: "binary" } },
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: { file: { type: "string", format: "binary" } },
                  required: ["file"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Classification result",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ClassifyResult" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
          },
        },
      },
      "/v1/process": {
        post: {
          summary: "Classify and extract Markdown",
          parameters: [
            {
              name: "pages",
              in: "query",
              schema: { type: "string" },
              description: "0-indexed pages, e.g. 0,2,5-8",
            },
            {
              name: "response",
              in: "query",
              schema: { type: "string", enum: ["json", "markdown"] },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/pdf": { schema: { type: "string", format: "binary" } },
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: { file: { type: "string", format: "binary" } },
                  required: ["file"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Process result",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProcessResult" },
                },
                "text/markdown": { schema: { type: "string" } },
              },
            },
          },
        },
      },
      "/v1/extract/text": {
        post: {
          summary: "Extract plain text",
          requestBody: {
            required: true,
            content: {
              "application/pdf": { schema: { type: "string", format: "binary" } },
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: { file: { type: "string", format: "binary" } },
                  required: ["file"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Plain text extraction" },
          },
        },
      },
      "/v1/extract/pages": {
        post: {
          summary: "Extract per-page Markdown",
          parameters: [
            {
              name: "pages",
              in: "query",
              schema: { type: "string" },
              description: "0-indexed pages, e.g. 0,2,5-8",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/pdf": { schema: { type: "string", format: "binary" } },
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: { file: { type: "string", format: "binary" } },
                  required: ["file"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Per-page markdown" },
          },
        },
      },
    },
  }
}
