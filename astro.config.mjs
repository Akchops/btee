import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://akchops.github.io',
  base: '/',
  output: 'static',
  build: { inlineStylesheets: 'auto', format: 'directory' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
