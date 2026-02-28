'use client';

import { useUser } from '@/lib/useUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecordings, addRecording, updateRecordings, deleteRecording, getStudentClasses, getTeacherInstitutes, getClassesForInstitute, getRecordingsForClass } from '@/lib/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addRecordingSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Pencil, Trash, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordings } from '../../db/schema';

export default function Recordings() {
  const { data: user, isLoading } = useUser();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<{ id: string; name: string; link: string; expiryDate: Date }[]>([]);
  const [originalData, setOriginalData] = useState<{ id: string; name: string; link: string; expiryDate: Date }[]>([]);
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewLink, setViewLink] = useState<string | null>(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['studentClasses'],
    queryFn: () => getStudentClasses(user.id), // Adjusted for student
  });

  const handleView = (link: string) => {
    setViewLink(link);
  };

  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
    enabled: user?.role === 'teacher',
  });

  const { data: recordings = [] } = useQuery({
    queryKey: ['recordings', selectedInstituteId, selectedClassId],
    queryFn: () => getRecordings({ instituteId: selectedInstituteId ?? undefined, classId: selectedClassId ?? undefined }),
    enabled: !!user,
  });

  const { data: filteredClasses = [] } = useQuery({
    queryKey: ['classesForInstitute', selectedInstituteId],
    queryFn: () => getClassesForInstitute(selectedInstituteId!),
    enabled: !!selectedInstituteId && user?.role === 'teacher',
  });
  
  // const { data: studentClasses = [] } = useQuery({
  //   queryKey: ['studentClasses', selectedClassId],
  //   queryFn: () => getClassesForInstitute(user.id),
  //   // enabled: !!selectedClassId && user?.role !== 'teacher',
  // });

  const addMutation = useMutation({
    mutationFn: addRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      toast.success('Recording added');
    },
    onError: (error: any) => toast.error('Failed to add recording'),
  });

  const updateMutation = useMutation({
    mutationFn: updateRecordings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      toast.success('Recordings updated');
      setEditMode(false);
    },
    onError: (error: any) => toast.error('Failed to update recordings'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      toast.success('Recording deleted');
    },
    onError: (error: any) => toast.error('Failed to delete recording'),
  });

  const form = useForm({
    resolver: zodResolver(addRecordingSchema),
    defaultValues: { classId: '', name: '', link: '', expiryDays: 3 },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  const onAddSubmit = (data: any) => {
    addMutation.mutate(data);
    form.reset();
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditedData(originalData);
    } else {

      // setOriginalData(recordings);
      // setEditedData([...recordings]);
    }
    setEditMode(!editMode);
  };

  const handleEditChange = (id: string, field: 'name' | 'link' | 'expiryDate', value: string | number | Date) => {
    setEditedData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const onSave = () => {
    updateMutation.mutate(editedData);
  };

  const onCancel = () => {
    setEditedData(originalData);
    setEditMode(false);
  };

  const onDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (user.role === 'teacher') {

    return (
      <div className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Select onValueChange={setSelectedInstituteId} value={selectedInstituteId ?? ''}>
            <SelectTrigger className="w-full md:w-auto">
              <SelectValue placeholder="Institute" />
            </SelectTrigger>
            <SelectContent>
              {institutes.map(inst => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedClassId} value={selectedClassId ?? ''}>
            <SelectTrigger className="w-full md:w-auto">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              {filteredClasses.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Recording</Button>
          </DialogTrigger>
          <DialogContent className="w-[90vw] max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Add Recording</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField control={form.control} name="classId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
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
                <FormField control={form.control} name="link" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expiryDays" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Days</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 3)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit">Submit</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Table className="mt-4 min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(recordings).map(row => (
              <TableRow key={row?.link}>
                <TableCell>
                  {editMode ? <Input value={row?.name} onChange={(e) => handleEditChange(row?.id, 'name', e.target.value)} /> : row?.name}
                </TableCell>
                <TableCell>
                  {editMode ? <Input value={row?.link} onChange={(e) => handleEditChange(row?.id, 'link', e.target.value)} /> : row?.link}
                </TableCell>
                <TableCell>
                  {editMode ? <Input type="date" value={row?.expiryDate?.toISOString().split('T')[0]} onChange={(e) => handleEditChange(row?.id, 'expiryDate', new Date(e.target.value))} /> : row?.expiryDate?.toDateString()}
                </TableCell>
                <TableCell>
                  <Button variant="destructive" onClick={() => onDelete(row?.id)}><Trash /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {editMode && (
          <div className="flex gap-2 mt-4">
            <Button onClick={onSave}>Save</Button>
            <Button variant="destructive" onClick={onCancel}>Cancel</Button>
          </div>
        )}
      </div>
    );
  } else {

    return (
      <div className="p-4">
        <div className="flex gap-2">
          <Select onValueChange={setSelectedClassId} value={selectedClassId ?? ''}>
            <SelectTrigger className="w-full md:w-auto">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(cls => (
                <SelectItem key={cls.classId} value={cls.classId}>{cls.className}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table className="mt-4 min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordings.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Button onClick={() => handleView(row.link)}><Eye /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {viewLink && (
          <Dialog open={!!viewLink} onOpenChange={() => setViewLink(null)}>
            <DialogContent className="max-w-full h-screen p-0">
              <iframe src={viewLink} className="w-full h-full" allowFullScreen />
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }
};