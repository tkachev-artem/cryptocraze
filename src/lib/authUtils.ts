export const SERVER_URL = 'http://localhost:8000';

export function redirectToLogin() {
  window.location.href = `${SERVER_URL}/api/auth/google`;
}

export function isUnauthorizedError(error: Error): boolean {
  return error.message.includes('401') || error.message.includes('Unauthorized');
}
