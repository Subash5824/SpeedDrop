declare module 'stack-utils' {
  interface StackUtilsOptions {
    cwd?: string;
    internals?: RegExp[];
    ignoredPackages?: string[];
    wrapCallSite?: (callSite: any) => any;
  }

  class StackUtils {
    constructor(options?: StackUtilsOptions);
    clean(stack: string): string;
    capture(limit?: number, startStackFunction?: Function): string[];
    captureString(limit?: number, startStackFunction?: Function): string;
    at(startStackFunction?: Function): any;
    parseLine(line: string): any;
  }

  export = StackUtils;
}