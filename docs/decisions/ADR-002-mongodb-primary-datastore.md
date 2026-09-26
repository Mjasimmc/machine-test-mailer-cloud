# ADR-002: MongoDB & Mongoose as Primary Datastore

## Status
Accepted

## Context
Form builders handle deeply nested, polymorphic AST structures (sections, zones, diverse field types, conditional logic, layout options) and dynamic, unstructured user submission payloads. Rigid relational schemas require complex JSON column manipulation or extensive join tables.

## Decision
Use **MongoDB** with **Mongoose** (`@nestjs/mongoose`) as the primary document store for Users, Forms, Form Versions, and Form Submissions.

## Consequences
- **Positive**: Native JSON/BSON document modeling for form AST trees and dynamic submission payloads; atomic document updates on draft saving; natural snapshot cloning for immutable version releases.
- **Negative**: Lack of relational foreign key cascading requires application-level integrity checks in `FormsService`.
- **Note on Dead Artifacts**: The repository contains a legacy `apps/api/prisma/schema.prisma` file which is not used or connected to the runtime.

## Related Areas
- `apps/api/src/forms/schemas/`
- `apps/api/src/users/schemas/`
