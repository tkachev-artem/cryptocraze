export const JWT_SECRET: string = process.env.JWT_SECRET || 'dev_insecure_jwt_secret_change_me';

export const JWT_OPTIONS = {
  expiresIn: '7d'
} as const;


