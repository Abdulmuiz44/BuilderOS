export interface BrowserNavigateOptions {
  url: string;
}

export interface BrowserScreenshotOptions {
  path: string;
}

export interface BrowserAdapter {
  navigate: (options: BrowserNavigateOptions) => Promise<void>;
  screenshot: (options: BrowserScreenshotOptions) => Promise<void>;
}
