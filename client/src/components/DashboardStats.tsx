import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardStats as DashboardStatsType } from '../../../server/src/schema';

interface DashboardStatsProps {
  stats: DashboardStatsType;
  isLoading: boolean;
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Distributors
          </CardTitle>
          <CardDescription className="text-xs">
            Active network members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            👥 {stats.totalDistributors}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Sales
          </CardTitle>
          <CardDescription className="text-xs">
            Number of sales records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            📊 {stats.totalSales}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Sales Volume
          </CardTitle>
          <CardDescription className="text-xs">
            Total monetary value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            💰 ${stats.totalSalesAmount.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Commissions Paid
          </CardTitle>
          <CardDescription className="text-xs">
            Total distributor earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            📈 ${stats.totalCommissionsPaid.toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}