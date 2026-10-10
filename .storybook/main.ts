import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../packages/react/src/**/*.stories.@(ts|tsx)", "../stories/**/*.stories.@(ts|tsx)"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  // A font is always a file of its own. Left to the default, the smallest
  // subsets would be written into the stylesheet as data: URLs, and the
  // built preview's Content Security Policy (scripts/storybook-csp.mjs)
  // would have to allow fonts from `data:`.
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      build: { assetsInlineLimit: (file: string) => (/\.woff2?$/.test(file) ? false : undefined) },
    }),
};
export default config;
