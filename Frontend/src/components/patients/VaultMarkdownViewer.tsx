import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";

export function VaultMarkdownViewer({ markdown }: { markdown: string }) {
  if (!markdown) return null;
  return <ScrollArea className="vault-markdown aelo-record max-h-96 max-w-none border border-border-button-default bg-background-secondary-default p-4 text-text-primary" aria-label="Leitor do checkpoint Markdown"><ReactMarkdown skipHtml allowedElements={["h1", "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "blockquote", "code", "pre", "hr"]} unwrapDisallowed>{markdown}</ReactMarkdown></ScrollArea>;
}
