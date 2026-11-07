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
        <ol className="divide-y divide-separator-border">
          {items.map((item) => (
            <li key={`${item.title}-${item.time}`} className="py-2.5 first:pt-0 last:pb-0">
              <p className="text-body-medium">{item.title}</p>
              <p className="mt-1 text-body-regular text-text-secondary">{item.description}</p>
              <p className="mt-1 text-caption-1-regular text-text-secondary">{item.time}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
