import { defineCloudflareConfig } from "@opennextjs/cloudflare"

// Default configuration: no R2 incremental cache (keeps the free tier / no
// extra bindings required). To enable ISR caching later, add an R2 bucket
// binding and pass an incrementalCache here. See:
// https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig()
