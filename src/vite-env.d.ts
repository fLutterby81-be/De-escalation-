/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUY_ME_A_COFFEE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
