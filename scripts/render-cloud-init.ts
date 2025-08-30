#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';

const required = ['DATABASE_URL', 'SESSION_SECRET', 'FRONTEND_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const;
type Req = typeof required[number];

for (const k of required) {
  if (!process.env[k]) {
    console.error(`Missing env ${k}`);
    process.exit(1);
  }
}

const sshPub = process.env.SSH_PUB || '';

const src = readFileSync('cloud-init.yaml', 'utf8');
let out = src
  .replace(/__DATABASE_URL__/g, process.env.DATABASE_URL!)
  .replace(/__SESSION_SECRET__/g, process.env.SESSION_SECRET!)
  .replace(/__FRONTEND_URL__/g, process.env.FRONTEND_URL!)
  .replace(/__GOOGLE_CLIENT_ID__/g, process.env.GOOGLE_CLIENT_ID!)
  .replace(/__GOOGLE_CLIENT_SECRET__/g, process.env.GOOGLE_CLIENT_SECRET!)
  .replace(/__SSH_PUB__/g, sshPub);

writeFileSync('cloud-init.rendered.yaml', out);
console.log('Rendered cloud-init to cloud-init.rendered.yaml');

