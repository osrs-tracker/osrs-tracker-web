// Embedded in the server bundle by esbuild's `binary` loader (`angular.json`), so nothing is read from disk at runtime
declare module '*.ttf' {
  const bytes: Uint8Array;
  export default bytes;
}

declare module '*.wasm' {
  const bytes: Uint8Array;
  export default bytes;
}

// satori's types import `ReactNode` for its element tree; the card is plain `{ type, props }` objects, without React
declare module 'react' {
  export type ReactNode = unknown;
}
