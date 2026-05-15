declare module "*.css" {}
declare module "server-only" {}
declare module "next/link" {
  const Link: (props: any) => JSX.Element;
  export default Link;
}
declare module "next/navigation" {
  export function notFound(): never;
  export function redirect(path: string): never;
}
declare module "next/cache" {
  export function revalidatePath(path: string): void;
}
declare module "next" {
  export type Metadata = Record<string, unknown>;
}
declare module "react" {
  export type ReactNode = unknown;
}
declare namespace React { type ReactNode = unknown; }
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } interface Element {} }
declare module "tailwindcss" { export type Config = Record<string, unknown>; }
declare module "node:crypto" { export function randomUUID(): string; }
declare module "node:fs" { export function mkdirSync(path: string, options?: { recursive?: boolean }): void; }
declare module "node:path" { export function dirname(path: string): string; export function join(...paths: string[]): string; }
declare module "node:sqlite" { export class DatabaseSync { constructor(path: string); exec(sql: string): void; prepare(sql: string): { all(...params: unknown[]): unknown[]; get(...params: unknown[]): unknown; run(...params: unknown[]): { changes: number; lastInsertRowid: unknown }; }; } }
declare const process: { cwd(): string; env: Record<string, string | undefined>; };
