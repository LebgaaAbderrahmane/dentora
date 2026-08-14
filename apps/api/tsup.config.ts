import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  external: ['@prisma/client', '@prisma/adapter-pg', 'pg', 'express', 'zod', 'bcryptjs'],
})
