// react-katex ships no types and has no @types package. It accepts the
// expression either as a `math` prop or as children; LearnAI.tsx uses children.
declare module 'react-katex' {
  import type { ComponentType, ReactNode } from 'react';

  interface KatexProps {
    math?: string;
    children?: ReactNode;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
    settings?: Record<string, unknown>;
  }

  export const InlineMath: ComponentType<KatexProps>;
  export const BlockMath: ComponentType<KatexProps>;
}
