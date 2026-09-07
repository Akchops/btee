import { defineConfig } from 'astro/config';
export default defineConfig({
  site: process.env.PAGES_SITE ?? 'https://akchops.github.io',
  base: process.env.PAGES_BASE ?? '/',
  output: 'static',
  build: { inlineStylesheets: 'never', format: 'directory' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
