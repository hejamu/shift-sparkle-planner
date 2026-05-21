import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Use dynamic import for ESM-only package
let componentTagger: any;

async function getComponentTagger() {
  if (!componentTagger) {
    const mod = await import("lovable-tagger");
    componentTagger = mod.componentTagger;
  }
  return componentTagger;
}

// https://vitejs.dev/config/
export default async function defineViteConfig({ mode }: { mode: string }) {
  const plugins = [react()];
  if (mode === "development") {
    const tagger = await getComponentTagger();
    plugins.push(tagger());
  }
  return {
    appType: "spa",
    server: {
      host: "::",
      port: 8080,
      proxy: {
        // Dev only. `npm run dev` runs on the host, so the backend is reached
        // via the host port mapping (docker-compose exposes backend on 3001).
        // In production, nginx proxies /api → backend:3001 inside the docker
        // network (see nginx.conf); vite is not involved.
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Vendor split keeps the main bundle smaller and lets the browser cache
      // chunks that rarely change (react / radix) across deploys. Each chunk
      // is fetched in parallel — cold-cache load is similar, warm-cache load
      // is much better.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            radix: [
              '@radix-ui/react-dialog',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-popover',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-toast',
            ],
            query: ['@tanstack/react-query'],
            i18n: ['i18next', 'react-i18next'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    test: {
      // Component tests need a DOM; server / pure-logic tests stay in node.
      // The pattern field uses the directory the test file sits in.
      environmentMatchGlobs: [
        ['src/components/**', 'jsdom'],
        ['src/__tests__/components/**', 'jsdom'],
      ],
      environment: 'node',
      globals: true,
      setupFiles: ['src/__tests__/vitest.setup.ts'],
    },
  };
}
