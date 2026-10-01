import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * OptionalJwtAuthGuard: allows unauthenticated requests through (no 401),
 * but populates req.user if a valid JWT is provided.
 * Used for endpoints that need org-scoped isolation when authenticated,
 * but also support legacy unauthenticated access (e.g. device agents).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  // Never throw — return null user if no/invalid token
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
