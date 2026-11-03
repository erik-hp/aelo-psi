import ReactMarkdown from "react-markdown";

export function VaultMarkdownViewer({ markdown }: { markdown: string }) {
  if (!markdown) return null;
  return <div className="max-h-96 overflow-auto rounded border p-3 text-sm leading-relaxed" aria-label="Leitor do checkpoint Markdown"><ReactMarkdown skipHtml allowedElements={["h1", "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "blockquote", "code", "pre", "hr"]} unwrapDisallowed>{markdown}</ReactMarkdown></div>;
}
