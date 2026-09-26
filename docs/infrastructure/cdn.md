# Infrastructure: CDN & Edge Caching Architecture

> **Scope**: Content Delivery Network edge topology, caching policies, strong ETag evaluation, and private data protection.  
> **Source of Truth**: [`apps/api/src/runtime/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/runtime/), [`nginx/nginx.conf`](file:///home/sct/dd/multi-tenant-form-builder/nginx/nginx.conf), and [`apps/web/nginx.conf`](file:///home/sct/dd/multi-tenant-form-builder/apps/web/nginx.conf).  
> **Last Verified**: 2026-09-25

---

## 1. Edge Layer Architecture

The edge layer acts as the primary boundary between external internet traffic and the private application cluster:

```text
INTERNET
   │
   ▼
[ Global CDN / Edge WAF ]  (Cloudflare / CloudFront)
   │
   ▼
[ Nginx Reverse Proxy / Load Balancer ]  (nginx/nginx.conf)
   ├── Static Web Assets (/assets/*)  ──>  Cached with 1y immutable header
   ├── Public Forms (/public/forms/:id) ──> Revalidated via ETag & Last-Modified
   └── Authenticated APIs (/forms, /auth, /users) ──> Cache-Control: no-store, no-cache
```

---

## 2. Strong ETag Semantics & Public Version Caching

1. **Deterministic Strong ETag Calculation**:
   * For public form version delivery (`GET /public/forms/:publicId`), `RuntimeService` computes a SHA-256 hash over the deployed immutable version snapshot:
     ```typescript
     const contentToHash = `${deployedVersion._id}-v${deployedVersion.versionNumber}-${versionDate.getTime()}`;
     const strongEtag = `"${createHash('sha256').update(contentToHash).digest('hex')}"`;
     ```
   * Emitted as a quoted string (`"hash"`), representing a true strong entity tag.
2. **Revalidation & Headers**:
   * `Cache-Control: public, no-cache` instructs CDNs and browsers to cache the response but revalidate with origin before serving.
   * `Last-Modified`: Set to `deployedVersion.updatedAt.toUTCString()`.
3. **Conditional HTTP Status 304**:
   * When client/CDN presents `If-None-Match: <etag>` or `If-Modified-Since`, the API returns HTTP 304 Not Modified without payload body, saving egress bandwidth.
4. **Draft Independence**:
   * Modifying the draft (`PATCH /forms/:id/draft`) does not mutate the deployed version or its ETag. Edge caches serve the immutable version until a new deployment explicitly releases a new version number.

---

## 3. Strict Private & Tenant Data Protection

To prevent cross-tenant or authenticated data leakage into shared edge caches:
* **Authenticated Endpoints**: All responses under `/forms`, `/users`, `/admin`, and `/dashboard` explicitly emit `no-cache, no-store` behavior.
* **No Shared Cache of Private Data**: Client-specific drafts, submissions, user profiles, and tokens are never publicly cacheable.
* **Nginx Cache Key Isolation**: Edge caching keys include request URI and host without mixing authenticated cookies or authorization headers into public caches.
