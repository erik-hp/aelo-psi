import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface ChartCardProps {
  title: string;
  description: string;
  data: object[];
  type?: "area" | "bar";
  dataKey: string;
}

export function ChartCard({ title, description, data, type = "area", dataKey }: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyState title="Sem dados no período" description="Nenhum indicador está disponível para esta visualização." /> : <div className="h-64 min-w-0 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            {type === "area" ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-table)" />
                <XAxis dataKey="month" stroke="var(--color-text-secondary)" fontSize={12} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-background-primary-default)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-button-default)", borderRadius: 12 }} />
                <Area type="monotone" dataKey={dataKey} stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.16} />
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-table)" />
                <XAxis dataKey="month" stroke="var(--color-text-secondary)" fontSize={12} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-background-primary-default)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-button-default)", borderRadius: 12 }} />
                <Bar dataKey={dataKey} fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>}
      </CardContent>
    </Card>
  );
}
