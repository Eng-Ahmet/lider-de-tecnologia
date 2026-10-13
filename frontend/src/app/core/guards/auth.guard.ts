import { CanActivateFn } from '@angular/router';

/**
 * Public Access Guard:
 * Grants full public access to all municipal platform routes without requiring login.
 */
export const authGuard: CanActivateFn = () => {
  return true;
};
