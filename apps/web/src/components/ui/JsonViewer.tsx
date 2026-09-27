"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./Button";

interface JsonViewerProps {
  data: unknown;
  className?: string;
  maxHeight?: string;
}

/**
 * Tokenizes and colorizes JSON text into semantic syntax-highlighted spans.
 */
function highlightJson(json: string): React.ReactNode[] {
  // Regex to match JSON tokens: keys, strings, numbers, booleans, null
  const regex =
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}[\],])/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(json)) !== null) {
    const textBefore = json.slice(lastIndex, match.index);
    if (textBefore) {
      nodes.push(textBefore);
    }

    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.endsWith(":")) {
      // JSON Object Key
      const keyName = token.slice(0, -1);
      nodes.push(
        <span
          key={key}
          className="text-cyan-600 dark:text-cyan-400 font-semibold"
        >
          {keyName}
        </span>,
      );
      nodes.push(<span key={`${key}-colon`}>: </span>);
    } else if (token.startsWith('"')) {
      // String value
      nodes.push(
        <span key={key} className="text-emerald-600 dark:text-emerald-400">
          {token}
        </span>,
      );
    } else if (token === "true" || token === "false") {
      // Boolean
      nodes.push(
        <span
          key={key}
          className="text-purple-600 dark:text-purple-400 font-medium"
        >
          {token}
        </span>,
      );
    } else if (token === "null") {
      // Null
      nodes.push(
        <span key={key} className="text-destructive font-medium italic">
          {token}
        </span>,
      );
    } else if (/^-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?$/.test(token)) {
      // Number
      nodes.push(
        <span
          key={key}
          className="text-amber-600 dark:text-amber-400 font-mono"
        >
          {token}
        </span>,
      );
    } else {
      // Structural brackets / braces / commas
      nodes.push(
        <span key={key} className="text-muted-foreground font-mono">
          {token}
        </span>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  const remaining = json.slice(lastIndex);
  if (remaining) {
    nodes.push(remaining);
  }

  return nodes;
}

export function JsonViewer({
  data,
  className = "",
  maxHeight = "max-h-64",
}: JsonViewerProps) {
  const [copied, setCopied] = React.useState(false);

  const formattedJson = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const highlightedContent = React.useMemo(() => {
    return highlightJson(formattedJson);
  }, [formattedJson]);

  const handleCopy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`relative rounded-lg border border-border bg-slate-950 text-slate-100 dark:bg-black/60 shadow-inner group ${className}`}
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 px-2 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700"
          title="Copy JSON to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400">
                Copied!
              </span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1" />
              <span className="text-[11px] font-medium">Copy</span>
            </>
          )}
        </Button>
      </div>

      <pre
        className={`overflow-x-auto p-4 text-[12px] font-mono leading-relaxed ${maxHeight}`}
      >
        <code>{highlightedContent}</code>
      </pre>
    </div>
  );
}
