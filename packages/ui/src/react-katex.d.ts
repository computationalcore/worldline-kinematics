/**
 * Type declarations for react-katex.
 */

declare module 'react-katex' {
  import { ComponentType } from 'react';

  interface KatexProps {
    math: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error) => JSX.Element;
    settings?: {
      displayMode?: boolean;
      throwOnError?: boolean;
      errorColor?: string;
      macros?: Record<string, string>;
      strict?:
        | boolean
        | string
        | ((errorCode: string, errorMsg: string, token?: unknown) => string);
      trust?:
        | boolean
        | ((context: { command: string; url: string; protocol: string }) => boolean);
      maxSize?: number;
      maxExpand?: number;
      globalGroup?: boolean;
    };
  }

  export const InlineMath: ComponentType<KatexProps>;
  export const BlockMath: ComponentType<KatexProps>;
}
