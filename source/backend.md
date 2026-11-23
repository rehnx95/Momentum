# Backend Engineering Roadmap
Legend: `[Easy]` `[Medium]` `[Hard]` show suggested learning difficulty; linked topics open their YouTube playlist videos.

Backend Engineering Roadmap

## Step 1 — Programming and Node.js fundamentals

### 1.1 — JavaScript you must be solid on
- 1. Execution context, call stack [Easy]
- 2. Closures [Easy]
- 3. this keyword [Easy]
- 4. Promises [Easy]
- 5. async/await and error handling in async code [Easy]
- 6. Event loop [Easy]
- 7. Array and object methods, destructuring [Easy]
- 8. ES Modules vs CommonJS [Easy]
### 1.2 — TypeScript
- 9. Types, interfaces, generics, narrowing, utility types [Easy]
- 10. tsconfig in strict mode [Easy]
- 11. Running TypeScript: tsx, ts-node, building with tsc [Easy]
### 1.3 — Node.js core
- 12. What Node is: V8, libuv [Easy]
- 13. npm, package.json, semver, lockfiles [Easy]
- 14. Node event loop phases; timers, process.nextTick, microtasks [Easy]
- 15. fs, path, process, os modules [Easy]
- 16. Buffers and streams, including backpressure [Easy]
- 17. EventEmitter [Easy]
- 18. worker_threads and child processes (intro) [Easy]
### 1.4 — Developer tooling
- 19. Git: branches, merges, rebase, resolving conflicts, pull requests [Easy]
- 20. Terminal and Linux basics: files, permissions, processes, ssh [Easy]
- 21. Calling APIs with curl and an API client (Postman, Bruno, or HTTPie) [Easy]
- 22. Debugging with breakpoints and the Node inspector [Easy]
- 23. ESLint and Prettier [Easy]
## Step 2 — Backend first principles (Playlist: Sriniously)

### 2.1 — Orientation
- 24. [Roadmap for backend from first principles](https://youtu.be/0Rwb4Xmlcwc) [Easy]
- 25. [Walk the path of a true backend engineer](https://youtu.be/3qFjZbFRSAU) [Easy]
- 26. [What is a backend, how do they work](https://youtu.be/6Ss4dJD9Kzg) [Easy]
- 27. [Benefits of learning backend engineering](https://youtu.be/6fqZs5Z3k9A) [Easy]
### 2.2 — Web layer
- 28. [Understanding HTTP for backend engineers](https://youtu.be/a3C1DMswClQ) [Easy]
- 29. [What is routing in backend](https://youtu.be/SubuU1iOC2s) [Easy]
- 30. [Serialization and deserialization](https://youtu.be/vzg90tY3uM0) [Easy]
### 2.3 — How the web works underneath
- 31. DNS, TCP, the TLS handshake, and HTTP/1.1 vs HTTP/2 vs HTTP/3 [Easy]
- 32. HTTP methods, status codes, headers, cookies, and caching headers [Easy]
- 33. Safe vs idempotent methods [Easy]
- 34. REST vs RPC at a glance [Easy]
## Step 3 — Building your first server

- 35. Server with Node's raw http module, no framework [Easy]
- 36. req/res objects, headers, streaming a response [Easy]
- 37. Environment variables: config via .env and process.env, never hardcode credentials [Easy]
- 38. Express setup (or Fastify): app, routes, middleware [Easy]
- 39. CORS: cross-origin fundamentals, preflight (OPTIONS), configuring the cors middleware [Easy]
- 40. Route params, query params, body parsing [Easy]
- 41. Custom and error-handling middleware [Easy]
- 42. express.Router() for modular routes [Easy]
- 43. TypeScript setup for the server [Easy]
- 44. API docs with OpenAPI/Swagger generated from your routes [Medium]
- 45. [OpenAPI: the universal contract between clients and servers](https://youtu.be/CwKsU84jIWs) [Medium]
- 46. Deploy to Render or Railway [Medium]
## Step 4 — Core backend architecture (Playlist)

- 47. [Authentication and authorization](https://youtu.be/A95rliroC8Q) [Medium]
- 48. [Validations and transformations](https://youtu.be/qedj_JjjL-U) [Medium]
- 49. [Controllers, services, repositories, middlewares, and request context](https://youtu.be/hyc-7w3pee8) [Medium]
- 50. [Complete REST API design](https://youtu.be/RG6q57DwV8Y) [Medium]
### 4.1 — Apply it
- 51. Rebuild the Express app in controller-service-repository layers [Medium]
- 52. Add Zod (or Joi) for validation, with type inference [Medium]
- 53. Implement JWT auth by hand once, then use a library [Medium]
- 54. Pagination (offset and cursor), filtering, and sorting [Medium]
- 55. One consistent error format and a central error handler [Medium]
- 56. API versioning [Medium]
- 57. Idempotency keys for unsafe requests such as payments and orders [Medium]
- 58. File uploads using presigned URLs (S3-style) [Medium]
- 59. Webhooks: receiving them and verifying signatures [Medium]
- 60. [Webhooks: how the server calls you](https://youtu.be/eWM0CVReP04) [Medium]
- 61. Dependency injection basics [Medium]
## Step 5 — Testing (Playlist)

- 62. [Testing for backend engineers: mocks, TDD, and coverage](https://youtu.be/HgVrfHX92y4) [Medium]
- 63. Unit testing business logic with Vitest or Jest [Medium]
- 64. Integration testing HTTP routes with Supertest [Medium]
- 65. Mocking DB calls vs transient test DBs (Docker-driven testing) [Medium]
- 66. Test data: fixtures and factories [Medium]
- 67. TDD on one small feature [Medium]
- 68. Coverage reports, and why coverage alone is not quality [Medium]
- 69. Running tests in CI on every push [Medium]
## Step 6 — Databases

### 6.1 — SQL (Playlist)
- 70. [Mastering databases with Postgres](https://youtu.be/F7Vwp2Xo5Do) [Medium]
### 6.2 — SQL hands-on
- 71. Raw SQL: SELECT, JOIN, GROUP BY, subqueries, CTEs, window functions [Medium]
- 72. Schema design: normalization, keys, constraints [Medium]
- 73. Indexing strategies and query optimization (EXPLAIN ANALYZE) [Medium]
- 74. Prisma or Drizzle: schema design, migrations, relations [Medium]
- 75. Database migrations: schema version control, safe CI/CD updates [Medium]
- 76. Connection pooling: why pool vs single clients (pg-pool, PgBouncer) [Medium]
- 77. Transactions and ACID at the ORM and query-builder layer; isolation levels, locks, deadlocks [Hard]
- 78. The N+1 query problem and how to spot it [Medium]
- 79. Backups and restores: test a restore once [Medium]
- 80. JSONB and Postgres full-text search [Medium]
### 6.3 — NoSQL (Opt)
- 81. MongoDB: documents, collections [Medium]
- 82. Mongoose: schemas, models, population [Medium]
- 83. SQL vs NoSQL: when to use which [Medium]
## Step 7 — Caching and background work (Playlist)

- 84. [Caching, the secret behind it all](https://youtu.be/estH64OkwxU) [Medium]
- 85. Redis in Node, cache-aside pattern (hands-on) [Medium]
- 86. Cache invalidation, TTLs, and cache stampedes [Medium]
- 87. [Task queues and background jobs](https://youtu.be/r-nQsyguU1Y) [Medium]
- 88. BullMQ on Redis: retries, concurrency limits, delayed jobs (hands-on) [Hard]
- 89. Scheduled jobs (cron) and idempotent workers [Hard]
- 90. Dead-letter queues for jobs that keep failing [Hard]
## Step 8 — Search (Playlist)

- 91. [Full text search using Elasticsearch](https://youtu.be/7_sovzAhRSM) [Medium]
- 92. Postgres full-text search first, since it covers many real needs [Medium]
- 93. One Elasticsearch query from a Node service (Opt) [Medium]
- 94. Vector search with pgvector (Opt) [Medium]
## Step 9 — Reliability engineering (Playlist)

- 95. [Error handling and building fault-tolerant systems](https://youtu.be/8NaM_9aKS24) [Medium]
- 96. [Production-grade configuration management](https://youtu.be/GR9NtirPXyc) [Medium]
- 97. [Logging, monitoring and observability](https://youtu.be/5PEuwgLOQQM) [Medium]
- 98. Request tracing: AsyncLocalStorage for request IDs across logs [Medium]
- 99. Production logging with Winston or Pino [Medium]
- 100. Metrics: request rate, errors, duration; intro to Prometheus and Grafana [Medium]
- 101. OpenTelemetry traces (Opt) [Medium]
- 102. Error tracking with a tool such as Sentry [Medium]
- 103. Timeouts, retries with backoff and jitter, and circuit breakers [Hard]
- 104. [Graceful shutdown (SIGTERM/SIGINT handling)](https://youtu.be/6rfBgphiCWM) [Hard]
- 105. Health check and readiness endpoints (/healthz, /ready) [Hard]
- 106. SLIs, SLOs, and writing a short postmortem after a failure [Hard]
## Step 10 — Security (Playlist)

### 10.1 — Fundamentals
- 107. [Backend security: everything you need](https://youtu.be/xB1C1xZZW4k) [Medium]
- 108. Production hardening: helmet, express-rate-limit, secure cookies [Hard]
- 109. OWASP Top 10, with one example of each in a test app (injection, XSS, CSRF, SSRF, broken access control) [Hard]
- 110. Secrets: never in git, use secret managers, rotate keys [Hard]
- 111. Dependency and secret scanning in CI [Hard]
- 112. Audit logs and least privilege [Hard]
### 10.2 — Auth in depth
- 113. Password hashing with bcrypt or argon2 [Hard]
- 114. Sessions vs JWT, refresh tokens, and revocation [Hard]
- 115. OAuth 2.0 and OIDC (log in with Google or GitHub) [Hard]
- 116. RBAC and resource-level authorization; multi-tenancy basics [Hard]
- 117. API keys and service-to-service auth [Hard]
## Step 11 — Containers and deployment (Playlist)

- 118. [The Twelve-Factor App](https://youtu.be/2_fcv3-XfN4) [Medium]
- 119. [DevOps for backend engineers](https://youtu.be/_E8X5RIJfQ4) [Medium]
- 120. Dockerfile basics, layer optimization, images vs containers [Medium]
- 121. Multi-container environments with docker-compose (app + Postgres + Redis) [Medium]
- 122. GitHub Actions: lint, type-check, test on every push; deploy on merge [Hard]
- 123. Environments: dev, staging, production, with config per environment [Hard]
- 124. Deployment: Render or Railway first, then a VPS or AWS EC2 [Hard]
- 125. Nginx as a reverse proxy; HTTPS with Let's Encrypt [Hard]
- 126. Zero-downtime deploys and rollbacks [Hard]
- 127. Securely managing prod env vars and secrets via secret managers [Hard]
- 128. Feature flags (Opt) [Hard]
## Step 12 — Scaling, performance, concurrency (Playlist)

- 129. [Backend scaling and performance, Part 1](https://youtu.be/z7kt_p44rjs) [Hard]
- 130. [Backend scaling and performance, Part 2](https://youtu.be/sOhAopEwjH4) [Hard]
- 131. [Concurrency and parallelism: IO bound vs CPU bound](https://youtu.be/bs9MEYRTA30) [Hard]
- 132. Load testing with k6 or autocannon [Hard]
- 133. Profiling a slow endpoint (flame graphs) [Hard]
- 134. Worker threads and clustering in Node [Hard]
- 135. Backpressure, rate limiting, and queue-based load leveling [Hard]
- 136. CDN and HTTP caching for static and public data [Hard]
## Step 13 — Cloud basics (Playlist)

- 137. [Object storage, Part 1](https://youtu.be/Ie0TjKI9cDI) [Medium]
- 138. [Object storage, Part 2](https://youtu.be/iWrVCxexUWY) [Medium]
- 139. One cloud provider done well (AWS, GCP, or Azure) [Hard]
- 140. Compute, object storage, a managed database, and networking (VPC) basics [Hard]
- 141. IAM: users, roles, and least-privilege policies [Hard]
- 142. Managed queues and serverless functions: when they fit [Hard]
- 143. Cost awareness: budgets, alerts, and shutting things down [Hard]
- 144. Infrastructure as code with Terraform (Opt) [Medium]
## Step 14 — System design (separate track)

- 145. Load balancers, reverse proxies (Nginx / HAProxy) [Hard]
- 146. DB scaling: replication, read replicas, connection concentration, sharding [Hard]
- 147. CAP theorem, availability, consistency models [Hard]
- 148. Event-driven architectures: Kafka / RabbitMQ at scale (concepts first) [Hard]
- 149. Sagas, the outbox pattern, and eventual consistency (Opt) [Hard]
- 150. [Real-time backends](https://youtu.be/wUQryt697cs) [Hard]
- 151. Back-of-the-envelope estimation: requests per second, storage, bandwidth [Hard]
- 152. Study resource: Alex Xu's System Design Interview, or ByteByteGo [Hard]
- 153. Practice designs: URL shortener, rate limiter, chat app, news feed, notification system, file storage [Hard]
