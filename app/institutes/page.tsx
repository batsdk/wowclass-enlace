'use client';

import { useUser } from '@/lib/useUser';
import { redirect, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInstitutes, addInstitute, updateInstitutes } from '@/lib/actions'; // Update actions to export getInstitutes/updateInstitutes
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addInstituteSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { Pencil, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Institutes() {
  // ✅ All hooks at the top, before any conditional logic
  const { data: user, isLoading } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<{ id: string; name: string; imageUrl?: string; address?: string }[]>([]);
  const [originalData, setOriginalData] = useState<{ id: string; name: string; imageUrl?: string; address?: string }[]>([]);

  // ✅ useQuery always called, but enabled conditionally
  const { data: institutes = [] } = useQuery({
    queryKey: ['institutes'],
    queryFn: () => getInstitutes(),
    enabled: !!user && user.role === 'teacher',
  });

  const addMutation = useMutation({
    mutationFn: addInstitute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutes'] });
      toast('Institute added');
    },
    onError: (error: any) => toast('Failed to add an institute'),
  });

  const updateMutation = useMutation({
    mutationFn: updateInstitutes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutes'] });
      toast('Institute updated');
      setEditMode(false);
    },
    onError: (error: any) => toast('Failed to update an institute'),
  });

  const form = useForm({
    resolver: zodResolver(addInstituteSchema),
    defaultValues: { name: '', imageUrl: '', address: '' },
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] w-full">
      <Loader2 className="h-10 w-10 text-gray-400 animate-spin mb-2" />
      <span className="text-gray-500 text-sm">Loading Institutes...</span>
    </div>
  );

  const onAddSubmit = (data: any) => {
    addMutation.mutate(data);
    form.reset();
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditedData(originalData);
    } else {
      setOriginalData(
        institutes.map(inst => ({
          id: inst.id,
          name: inst.name,
          imageUrl: inst.imageUrl ?? undefined,
          address: inst.address ?? undefined,
        }))
      );
      setEditedData(
        institutes.map(inst => ({
          id: inst.id,
          name: inst.name,
          imageUrl: inst.imageUrl ?? undefined,
          address: inst.address ?? undefined,
        }))
      );
    }
    setEditMode(!editMode);
  };

  const handleEditChange = (id: string, field: keyof typeof addInstituteSchema.shape, value: string) => {
    setEditedData(prev => prev.map(inst => inst.id === id ? { ...inst, [field]: value } : inst));
  };

  const onSave = () => {
    updateMutation.mutate(editedData);
  };

  const onCancel = () => {
    setEditedData(originalData);
    setEditMode(false);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Institutes</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Institute</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Institute</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (optional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (optional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit">Submit</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-end mb-2">
        <Button variant={editMode ? 'secondary' : 'default'} onClick={toggleEditMode}>
          {editMode ? 'Editing...' : 'Edit All'}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Image URL</TableHead>
            <TableHead>Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(editMode ? editedData : institutes).map(inst => (
            <TableRow key={inst.id}>
              <TableCell>
                {editMode ? <Input value={inst.name} onChange={(e) => handleEditChange(inst.id, 'name', e.target.value)} /> : inst.name}
              </TableCell>
              <TableCell>
                {editMode ? <Input value={inst.imageUrl || ''} onChange={(e) => handleEditChange(inst.id, 'imageUrl', e.target.value)} /> : inst.imageUrl || '-'}
              </TableCell>
              <TableCell>
                {editMode ? <Input value={inst.address || ''} onChange={(e) => handleEditChange(inst.id, 'address', e.target.value)} /> : inst.address || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editMode && (
        <div className="flex justify-end mt-4 gap-2">
          <Button onClick={onSave}>Save</Button>
          <Button variant="destructive" onClick={onCancel}>Cancel</Button>
        </div>
      )}
    </div>
  );
}