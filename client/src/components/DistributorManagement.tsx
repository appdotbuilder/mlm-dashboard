import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Users, Eye } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  DistributorWithStats, 
  CreateDistributorInput, 
  Distributor,
  DownlineHierarchy 
} from '../../../server/src/schema';

interface DistributorManagementProps {
  onDataChange: () => void;
}

export function DistributorManagement({ onDataChange }: DistributorManagementProps) {
  const [distributors, setDistributors] = useState<DistributorWithStats[]>([]);
  const [allDistributors, setAllDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedHierarchy, setSelectedHierarchy] = useState<DownlineHierarchy | null>(null);
  const [isHierarchyDialogOpen, setIsHierarchyDialogOpen] = useState(false);

  // Form state with proper typing
  const [formData, setFormData] = useState<CreateDistributorInput>({
    name: '',
    referrerId: null
  });

  // useCallback to memoize function used in useEffect
  const loadDistributors = useCallback(async () => {
    try {
      setIsLoading(true);
      const [distributorsWithStats, allDist] = await Promise.all([
        trpc.getDistributorsWithStats.query(),
        trpc.getDistributors.query()
      ]);
      setDistributors(distributorsWithStats);
      setAllDistributors(allDist);
    } catch (error) {
      console.error('Failed to load distributors:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps since trpc is stable

  // useEffect with proper dependencies
  useEffect(() => {
    loadDistributors();
  }, [loadDistributors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await trpc.createDistributor.mutate(formData);
      // Reset form
      setFormData({
        name: '',
        referrerId: null
      });
      setIsDialogOpen(false);
      await loadDistributors();
      onDataChange(); // Refresh dashboard stats
    } catch (error) {
      console.error('Failed to create distributor:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewHierarchy = async (distributorId: number) => {
    try {
      const hierarchy = await trpc.getDownlineHierarchy.query({ distributorId });
      setSelectedHierarchy(hierarchy);
      setIsHierarchyDialogOpen(true);
    } catch (error) {
      console.error('Failed to load hierarchy:', error);
    }
  };

  const renderHierarchy = (hierarchy: DownlineHierarchy, level: number = 0) => {
    return (
      <div key={hierarchy.distributor.id} className={`ml-${level * 4} mb-2`}>
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
          <span className="text-sm font-medium">{hierarchy.distributor.name}</span>
          <Badge variant="secondary" className="text-xs">
            ID: {hierarchy.distributor.id}
          </Badge>
          {level === 0 && (
            <Badge variant="default" className="text-xs">
              👑 Root
            </Badge>
          )}
        </div>
        {hierarchy.children && hierarchy.children.map((child: DownlineHierarchy) => 
          renderHierarchy(child, level + 1)
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 Distributor Management</h2>
          <p className="text-gray-600">Manage your MLM network distributors</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Distributor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Distributor</DialogTitle>
              <DialogDescription>
                Create a new distributor in your MLM network
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Distributor Name</Label>
                <Input
                  id="name"
                  placeholder="Enter distributor name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateDistributorInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referrer">Referrer (Upline)</Label>
                <Select 
                  value={formData.referrerId?.toString() || 'none'} 
                  onValueChange={(value: string) =>
                    setFormData((prev: CreateDistributorInput) => ({ 
                      ...prev, 
                      referrerId: value === 'none' ? null : parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select referrer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No referrer (Top-level)</SelectItem>
                    {allDistributors.map((distributor: Distributor) => (
                      <SelectItem key={distributor.id} value={distributor.id.toString()}>
                        {distributor.name} (ID: {distributor.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Distributor'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Distributor List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Distributor Network
          </CardTitle>
          <CardDescription>
            View all distributors with their performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading distributors...</p>
            </div>
          ) : distributors.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No distributors found</p>
              <p className="text-sm text-gray-500">Add your first distributor to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Referrer ID</TableHead>
                    <TableHead>Direct Sales</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Downline</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributors.map((distributor: DistributorWithStats) => (
                    <TableRow key={distributor.id}>
                      <TableCell className="font-medium">
                        {distributor.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{distributor.name}</span>
                          {!distributor.referrerId && (
                            <Badge variant="outline" className="text-xs">
                              👑 Top-level
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {distributor.referrerId || (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">
                          ${distributor.directSales.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-blue-600 font-medium">
                          ${distributor.earnedCommission.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {distributor.downlineCount} members
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {distributor.created_at.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewHierarchy(distributor.id)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Hierarchy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hierarchy Dialog */}
      <Dialog open={isHierarchyDialogOpen} onOpenChange={setIsHierarchyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Downline Hierarchy
            </DialogTitle>
            <DialogDescription>
              View the complete downline structure for this distributor
            </DialogDescription>
          </DialogHeader>
          {selectedHierarchy ? (
            <div className="space-y-4">
              <Separator />
              <div className="bg-gray-50 p-4 rounded-lg">
                {renderHierarchy(selectedHierarchy)}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading hierarchy...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}