# @enterprise/shared

Single source of truth for **types**, **Zod validation schemas**, **enums**, and **constants** consumed by both `apps/web` and `apps/api`.

## Usage

```typescript
import {
  loginSchema,
  type LoginInput,
  type LoginResponse,
  type ApiSuccessResponse,
  AUTH_ERROR_CODES,
  UserRole,
} from "@enterprise/shared";
```

**Rule:** Import only from `@enterprise/shared`. No deep imports.

## Structure

```
src/
├── enums/          # Const enums (tree-shakable)
├── constants/      # Auth policy values (password, OTP, JWT, rate limits)
├── types/          # TypeScript contracts (DTOs, API responses)
├── schemas/        # Zod schemas (runtime validation + z.infer types)
└── index.ts        # Barrel exports
```

## Frontend

```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@enterprise/shared";

const form = useForm<LoginInput>({
  resolver: zodResolver(loginSchema),
});
```

## Backend

```typescript
import { loginSchema, type LoginInput } from "@enterprise/shared";

const result = loginSchema.safeParse(req.body);
if (!result.success) {
  // return ApiErrorResponse with validation errors
}
const data: LoginInput = result.data;
```

## Scripts

```bash
npm run type-check
```
