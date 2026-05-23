declare module "@stackbit/types" {
  export function defineStackbitConfig(config: unknown): unknown
}

declare module "@stackbit/cms-git" {
  export class GitContentSource {
    constructor(config: unknown)
  }
}
