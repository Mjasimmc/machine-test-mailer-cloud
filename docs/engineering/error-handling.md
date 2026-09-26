# Engineering: Error Handling & Exceptions

> **Scope**: Exception types, HTTP status codes, and error formatting.  
> **Source of Truth**: NestJS exception filters and controllers.  
> **Last Verified**: 2026-09-24

---

## 1. Standard Error Responses

Errors emitted by the API adhere to the standard NestJS JSON envelope:

```json
{
  "statusCode": 403,
  "message": "Your account has been suspended.",
  "error": "ACCOUNT_SUSPENDED"
}
```

---

## 2. Common Exception Types & Status Codes

| Exception | Status Code | Typical Cause |
|---|---|---|
| `UnauthorizedException` | `401` | Missing, expired, or invalid JWT signature |
| `ForbiddenException` | `403` | User account suspended (`ACCOUNT_SUSPENDED`) or accessing a form owned by another user |
| `NotFoundException` | `404` | Non-existent user, form, or invalid ObjectId |
| `BadRequestException` | `400` | DTO validation failure or empty title / invalid parameters |
| `ConflictException` | `409` | Email address already registered |
