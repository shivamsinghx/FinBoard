'use client';

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from '@/components/ui/code-block';
import { useHighlightedCode } from '@/hooks/use-highlighted-code';

/**
 * Highlighted, copyable code block for docs. Client-only because
 * highlighting runs through `useHighlightedCode` (shiki).
 */
export function DocCode({
  code,
  title,
  lang = 'bash',
  className,
}: {
  code: string;
  title?: string;
  lang?: 'bash' | 'json' | 'shell' | 'text';
  className?: string;
}) {
  const lines = useHighlightedCode(code, lang);
  return (
    <CodeBlock size="sm" className={className ?? 'bg-raised'}>
      <CodeBlockHeader>
        <CodeBlockTitle>{title ?? lang.toUpperCase()}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent className="text-[11px]">
        {lines.map((line, i) => (
          <CodeBlockLine key={i}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}
