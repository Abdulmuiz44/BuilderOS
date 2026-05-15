declare module "node:crypto" {
  export function randomUUID(): string;
}

declare module "node:fs" {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
};
