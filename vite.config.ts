import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mani-tintin/',
  build: { target: ['es2020', 'safari15'] },
});
