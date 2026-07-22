/// <reference types="vite/client" />

interface ViteTypeOptions {
  readonly strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PROJECT_DIR?: string;
}

interface HackromStudioDesktopBridge {
  pickProjectDirectory(): Promise<string | null>;
}

interface Window {
  readonly hackromStudio?: HackromStudioDesktopBridge;
}
