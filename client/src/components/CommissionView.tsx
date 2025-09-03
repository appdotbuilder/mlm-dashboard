import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Commission } from '../../../server/src/schema';

export function CommissionView() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // useCallback to memoize function used in useEffect
  const loadCommissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const commissionsData = await trpc.getCommissions.query();
      setCommissions(commissionsData);
    } catch (error) {
      console.error('Failed to load commissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps since trpc is stable

  // useEffect with proper dependencies
  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  const totalOwnSales = commissions.reduce((total: number, commission: Commission) => total + commission.ownSales, 0);
  const totalOwnCommissions = commissions.reduce((total: number, commission: Commission) => total + commission.ownCommission, 0);
  const totalDownlineCommissions = commissions.reduce((total: number, commission: Commission) => total + commission.downlineCommission, 0);
  const totalCommissions = commissions.reduce((total: number, commission: Commission) => total + commission.totalCommission, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📈 Commission Overview</h2>
        <p className="text-gray-600">Track commissions earned by distributors</p>
      </div>

      {/* Commission Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Own Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              💰 ${totalOwnSales.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Own Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              📊 ${totalOwnCommissions.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Downline Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              🎯 ${totalDownlineCommissions.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              🏆 ${totalCommissions.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Commission Breakdown
          </CardTitle>
          <CardDescription>
            Detailed commission information for each distributor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-gray-600">Loading commissions...</p>
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No commission data available</p>
              <p className="text-sm text-gray-500">
                Commission data will appear here once there are sales and distributors in the system
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distributor ID</TableHead>
                    <TableHead>Distributor Name</TableHead>
                    <TableHead>Own Sales</TableHead>
                    <TableHead>Own Commission</TableHead>
                    <TableHead>Downline Commission</TableHead>
                    <TableHead>Total Commission</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission: Commission) => (
                    <TableRow key={commission.distributorId}>
                      <TableCell className="font-medium">
                        {commission.distributorId}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{commission.distributorName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-blue-600 font-medium">
                          ${commission.ownSales.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">
                          ${commission.ownCommission.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-purple-600 font-medium">
                          ${commission.downlineCommission.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-emerald-600 font-bold text-lg">
                          ${commission.totalCommission.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {commission.totalCommission > 1000 && (
                          <Badge variant="default" className="bg-gold text-white">
                            🏆 Top Earner
                          </Badge>
                        )}
                        {commission.totalCommission > 500 && commission.totalCommission <= 1000 && (
                          <Badge variant="secondary">
                            🥈 High Performer
                          </Badge>
                        )}
                        {commission.totalCommission > 100 && commission.totalCommission <= 500 && (
                          <Badge variant="outline">
                            📈 Growing
                          </Badge>
                        )}
                        {commission.totalCommission <= 100 && commission.totalCommission > 0 && (
                          <Badge variant="secondary" className="text-gray-600">
                            🌱 Starting
                          </Badge>
                        )}
                        {commission.totalCommission === 0 && (
                          <Badge variant="outline" className="text-gray-400">
                            💤 Inactive
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Structure Info */}
      {commissions.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">📋 Commission Structure Information</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <div className="space-y-2 text-sm">
              <p><strong>Own Commission:</strong> Commission earned from personal sales</p>
              <p><strong>Downline Commission:</strong> Commission earned from sales made by distributors in your network</p>
              <p><strong>Total Commission:</strong> Combined commission from own sales and downline sales</p>
              <p className="text-xs text-blue-600 mt-4">
                💡 <em>Commission rates and structures may vary based on your MLM program rules</em>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}