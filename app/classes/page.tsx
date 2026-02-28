'use client';

import { useUser } from '@/lib/useUser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClasses, addClass, updateClasses, getTeacherInstitutes } from '@/lib/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addClassSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save, X, MessageSquare } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Classes() {
  const { data: user, isLoading } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [originalData, setOriginalData] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', selectedInstituteId],
    queryFn: async () => {
      const allClasses = await getClasses();
      if (selectedInstituteId) {
        return allClasses.filter(cls => cls.instituteId === selectedInstituteId);
      }
      return allClasses;
    },
    enabled: !!user && user.role === 'teacher',
  });

  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
    enabled: !!user && user.role === 'teacher',
  });

  const addMutation = useMutation({
    mutationFn: addClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class added');
    },
    onError: (error: any) => toast.error('Failed to add a class'),
  });

  const updateMutation = useMutation({
    mutationFn: updateClasses,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Classes updated');
      setEditMode(false);
    },
    onError: (error: any) => toast.error('Failed to update classes'),
  });

  const form = useForm({
    resolver: zodResolver(addClassSchema),
    defaultValues: { instituteId: '', name: '', description: '' },
  });

  const onAddSubmit = (data: any) => {
    addMutation.mutate(data);
    form.reset();
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditedData(originalData);
    } else {
      setOriginalData(classes.map(cls => ({ id: cls.id, name: cls.name, description: cls.description ?? undefined })));
      setEditedData(classes.map(cls => ({ id: cls.id, name: cls.name, description: cls.description ?? undefined })));
    }
    setEditMode(!editMode);
  };

  const handleEditChange = (id: string, field: 'name' | 'description', value: string) => {
    setEditedData(prev => prev.map(cls => cls.id === id ? { ...cls, [field]: value } : cls));
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
        <h1 className="text-2xl font-bold">Classes</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Class</Button>
          </DialogTrigger>
          <DialogContent className="w-[90vw] max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Add Class</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField control={form.control} name="instituteId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institute</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select institute" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {institutes.map(inst => (
                          <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
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

        {/* Filter Dropdown for Institutes */}
        <div className="mb-4 mr-4">
          <Select onValueChange={(value) => setSelectedInstituteId(value === 'all' ? null : value)} defaultValue="all">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Institute" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Institutes</SelectItem>
              {institutes.map(inst => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant={editMode ? 'secondary' : 'default'} onClick={toggleEditMode}>
          {editMode ? 'Editing...' : 'Edit All'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table className="w-[800px] min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(editMode ? editedData : classes).map(cls => (
              <TableRow key={cls.id}>
                <TableCell>
                  {editMode ? <Input value={cls.name} onChange={(e) => handleEditChange(cls.id, 'name', e.target.value)} /> : cls.name}
                </TableCell>
                <TableCell>
                  {editMode ? <Input value={cls.description || ''} onChange={(e) => handleEditChange(cls.id, 'description', e.target.value)} /> : cls.description || '-'}
                </TableCell>
                <TableCell>
                  {!editMode && (
                    <Button variant="ghost" size="sm" asChild title="Class Chat">
                      <Link href={`/chat/${cls.id}`}>
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editMode && (
        <div className="flex justify-end mt-4 gap-2">
          <Button onClick={onSave}>Save</Button>
          <Button variant="destructive" onClick={onCancel}>Cancel</Button>
        </div>
      )}
    </div>
  );
}