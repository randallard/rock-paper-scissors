/// <reference types="vite/client" />

/**
 * Type declarations for YAML imports via Vite plugin
 */
declare module '*.yaml' {
  const content: Record<string, unknown>;
  export default content;
}

declare module '*.yml' {
  const content: Record<string, unknown>;
  export default content;
}
