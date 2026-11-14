export type Rewrite = { before: string; after: string }

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': { isAuto: boolean; isBusy: boolean; last: Rewrite | null }
  }
}
