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
        '/api': {
          target: 'http://backend:3001',
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
  };
}
