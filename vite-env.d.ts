/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOTION_CLIENT_ID?: string;
  readonly VITE_NOTION_CLIENT_SECRET?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __VITE_NOTION_CLIENT_ID__: string;
declare const __VITE_NOTION_CLIENT_SECRET__: string;

declare interface Window {
  __VITE_NOTION_CLIENT_ID__?: string;
  __VITE_NOTION_CLIENT_SECRET__?: string;
}
