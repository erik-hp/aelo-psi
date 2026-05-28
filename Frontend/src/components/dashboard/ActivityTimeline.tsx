import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineItem {
  title: string;
  description: string;
  time: string;
}

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade recente</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {items.map((item) => (
            <li key={`${item.title}-${item.time}`} className="relative pl-6">
              <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
