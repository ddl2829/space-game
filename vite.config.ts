import { defineConfig } from 'vite';

export default defineConfig({
  // Set base to your repo name for GitHub Pages
  // Change 'space' to your actual repository name
  base: '/space/',
  build: {
    outDir: 'dist',
  },
});
