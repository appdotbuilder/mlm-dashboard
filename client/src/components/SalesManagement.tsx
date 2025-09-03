import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, ShoppingCart } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Sale, 
  CreateSaleInput, 
  Distributor 
} from '../../../server/src/schema';

interface SalesManagementProps {
  onDataChange: () => void;
}

export function SalesManagement({ onDataChange }: SalesManagementProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state with proper typing
  const [formData, setFormData] = useState<CreateSaleInput>({
    distributorId: 0,
    productName: '',
    quantity: 1,
    amount: 0,
    date: new Date()
  });

  // useCallback to memoize function used in useEffect
  const loadSales = useCallback(async () => {
    try {
      setIsLoading(true);
      const [salesData, distributorsData] = await Promise.all([
        trpc.getSales.query(),
        trpc.getDistributors.query()
      ]);
      setSales(salesData);
      setDistributors(distributorsData);
    } catch (error) {
      console.error('Failed to load sales:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps since trpc is stable

  // useEffect with proper dependencies
  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await trpc.createSale.mutate(formData);
      // Reset form
      setFormData({
        distributorId: 0,
        productName: '',
        quantity: 1,
        amount: 0,
        date: new Date()
      });
      setIsDialogOpen(false);
      await loadSales();
      onDataChange(); // Refresh dashboard stats
    } catch (error) {
      console.error('Failed to create sale:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getDistributorName = (distributorId: number): string => {
    const distributor = distributors.find((d: Distributor) => d.id === distributorId);
    return distributor ? distributor.name : `Unknown (ID: ${distributorId})`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">💰 Sales Management</h2>
          <p className="text-gray-600">Track and manage all sales records</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Sale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Sale</DialogTitle>
              <DialogDescription>
                Add a new sales record to the system
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="distributor">Distributor</Label>
                <Select 
                  value={formData.distributorId.toString() || ''} 
                  onValueChange={(value: string) =>
                    setFormData((prev: CreateSaleInput) => ({ 
                      ...prev, 
                      distributorId: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributors.map((distributor: Distributor) => (
                      <SelectItem key={distributor.id} value={distributor.id.toString()}>
                        {distributor.name} (ID: {distributor.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  placeholder="Enter product name"
                  value={formData.productName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateSaleInput) => ({ ...prev, productName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Quantity"
                    value={formData.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSaleInput) => ({ 
                        ...prev, 
                        quantity: parseInt(e.target.value) || 1 
                      }))
                    }
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Amount"
                    value={formData.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSaleInput) => ({ 
                        ...prev, 
                        amount: parseFloat(e.target.value) || 0 
                      }))
                    }
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Sale Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateSaleInput) => ({ 
                      ...prev, 
                      date: new Date(e.target.value) 
                    }))
                  }
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || formData.distributorId === 0}>
                  {isCreating ? 'Creating...' : 'Record Sale'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Sales Records
          </CardTitle>
          <CardDescription>
            All recorded sales transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600">Loading sales...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No sales recorded yet</p>
              <p className="text-sm text-gray-500">Record your first sale to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale ID</TableHead>
                    <TableHead>Distributor</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Sale Date</TableHead>
                    <TableHead>Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale: Sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        #{sale.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {getDistributorName(sale.distributorId)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            ID: {sale.distributorId}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{sale.productName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {sale.quantity} units
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 font-bold">
                          ${sale.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {sale.date.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {sale.created_at.toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Summary */}
      {sales.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Sales Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                📊 {sales.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Units Sold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                📦 {sales.reduce((total: number, sale: Sale) => total + sale.quantity, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                💰 ${sales.reduce((total: number, sale: Sale) => total + sale.amount, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}