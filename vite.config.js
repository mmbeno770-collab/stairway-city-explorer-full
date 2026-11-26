import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: "public",
  build: {
    outDir: "www",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20000,
          groups: [
            { name: "react-vendor", test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: "three-vendor", test: /node_modules[\\/]three[\\/]/, priority: 25 },
            { name: "r3f-vendor", test: /node_modules[\\/](?:@react-three|react-reconciler|@react-spring|camera-controls|suspend-react|@use-gesture|@pmndrs|zustand|maath)[\\/]/, priority: 20 },
            { name: "supabase-vendor", test: /node_modules[\\/]@supabase[\\/]/, priority: 15 },
            { name: "vendor", test: /node_modules[\\/]/, minSize: 100000, priority: 1 }
          ]
        }
      }
    }
  }
});
