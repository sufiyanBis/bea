import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Deployment URL is not decided yet (TODO(Faisal): confirm deployment URL).
// VITE_BASE_PATH  -> Vite `base` and the router basename (default "/").
// VITE_PUBLIC_BASE_URL -> share links, Open Graph tags and "View online" links in exports.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = (env.VITE_BASE_PATH || '/').replace(/\/?$/, '/');
  return {
    base,
    build: {
      rollupOptions: {
        maxParallelFileOps: 32,
      },
    },
    plugins: [
      react(),
      {
        name: 'public-base-url',
        transformIndexHtml: (html: string) => html.replace(/__PUBLIC_BASE_URL__/g, env.VITE_PUBLIC_BASE_URL || ''),
      },
    ],
    server: { port: 5173, strictPort: true },
    worker: { format: 'es' },
    optimizeDeps: { include: ['exceljs', 'jspdf', 'jspdf-autotable', 'jszip', 'country-flag-emoji-polyfill', '@tanstack/react-table', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'd3-force'] },
    test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  };
}) as any;
