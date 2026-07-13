import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the same build works from Vercel (served at /) and
  // from Capacitor's iOS wrapper (served at capacitor:// with no origin root).
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'es2020' },
});
