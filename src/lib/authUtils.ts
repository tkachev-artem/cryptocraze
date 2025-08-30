import { API_BASE_URL } from './api';

export const SERVER_URL = API_BASE_URL;

export function redirectToLogin() {
  window.location.href = `${SERVER_URL}/auth/google`;
}

export function isUnauthorizedError(error: Error): boolean {
  return error.message.includes('401') || error.message.includes('Unauthorized');
}
