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
              <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-accent-600" />
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
