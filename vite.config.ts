/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { execSync } from "child_process";

const getGitCommitSha = (): string => {
  try {
    return (
      process.env.VITE_APP_VERSION ||
      process.env.COMMIT_REF ||
      process.env.GITHUB_SHA ||
      execSync("git rev-parse --short HEAD").toString().trim()
    );
  } catch {
    return "unknown";
  }
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    esbuild: {
      drop: isProd ? ['debugger'] : [],
      pure: isProd ? ['console.debug'] : [],
    },
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: process.env.VITE_API_TARGET || "http://127.0.0.1:3000",
          changeOrigin: Boolean(process.env.VITE_API_TARGET),
        },
      },
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'react', 'react-dom'],
    },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(getGitCommitSha()),
    },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core Library Vendor Chunk — Consolidate frequent/essential libs to reduce evaluation overhead
          if (
            id.includes('@radix-ui/') ||
            id.includes('@tanstack/') ||
            id.includes('@hookform/') ||
            id.includes('node_modules/zod') ||
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/dompurify') ||
            id.includes('node_modules/isomorphic-dompurify')
          ) {
            return 'vendor-lib';
          }

          // Charts / data-vis — heavy, only needed on dashboard/explore routes
          if (id.includes('node_modules/recharts') ||
            id.includes('node_modules/d3') ||
            id.includes('node_modules/d3-') ||
            id.includes('node_modules/victory-vendor')) {
            return 'charts';
          }

          // Animation — heavy, isolate for pages that use framer-motion
          if (id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/motion-dom') ||
            id.includes('node_modules/motion-utils')) {
            return 'framer';
          }

          // Internationalisation
          if (id.includes('node_modules/i18next') ||
            id.includes('node_modules/react-i18next')) {
            return 'i18n';
          }

          // Everything else in node_modules → general vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
  },
  };
});

