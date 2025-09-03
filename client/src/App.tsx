import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { DashboardStats } from './components/DashboardStats';
import { DistributorManagement } from './components/DistributorManagement';
import { SalesManagement } from './components/SalesManagement';
import { CommissionView } from './components/CommissionView';
// Using type-only imports for better TypeScript compliance
import type { DashboardStats as DashboardStatsType } from '../../server/src/schema';

function App() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsType>({
    totalSales: 0,
    totalCommissionsPaid: 0,
    totalDistributors: 0,
    totalSalesAmount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // useCallback to memoize function used in useEffect
  const loadDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const stats = await trpc.getDashboardStats.query();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps since trpc is stable

  // useEffect with proper dependencies
  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  const refreshData = useCallback(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MLM Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Manage distributors, track sales, and monitor commissions
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              📊 MLM Management System
            </Badge>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="mb-8">
          <DashboardStats stats={dashboardStats} isLoading={isLoading} />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="distributors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="distributors" className="flex items-center gap-2">
              👥 Distributors
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              💰 Sales
            </TabsTrigger>
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              📈 Commissions
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              📊 Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distributors">
            <DistributorManagement onDataChange={refreshData} />
          </TabsContent>

          <TabsContent value="sales">
            <SalesManagement onDataChange={refreshData} />
          </TabsContent>

          <TabsContent value="commissions">
            <CommissionView />
          </TabsContent>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>📊 System Overview</CardTitle>
                <CardDescription>
                  Comprehensive view of your MLM network performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Network Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Distributors:</span>
                        <span className="font-semibold">{dashboardStats.totalDistributors}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Sales Records:</span>
                        <span className="font-semibold">{dashboardStats.totalSales}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sales Volume:</span>
                        <span className="font-semibold text-green-600">
                          ${dashboardStats.totalSalesAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Commissions Paid:</span>
                        <span className="font-semibold text-blue-600">
                          ${dashboardStats.totalCommissionsPaid.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">System Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">System Status:</span>
                        <Badge variant="default" className="bg-green-500">
                          🟢 Online
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Data Status:</span>
                        <Badge variant={isLoading ? "secondary" : "default"}>
                          {isLoading ? "🔄 Loading" : "✅ Ready"}
                        </Badge>
                      </div>
                      <div className="pt-4">
                        <Button 
                          onClick={refreshData} 
                          disabled={isLoading}
                          variant="outline"
                          className="w-full"
                        >
                          {isLoading ? "🔄 Refreshing..." : "🔄 Refresh Data"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;