import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://endoyuki.jp",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
});
