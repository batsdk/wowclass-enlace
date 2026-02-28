'use client';

import { useUser } from '@/lib/useUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttentions, addAttention, updateAttentions, getTeacherInstitutes, getClassesForInstitute, getStudentsForClass } from '@/lib/actions'; // Add these actions
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addAttentionSchema } from '@/lib/schemas'; // Add Zod schema
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AttentionTab = () => {
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<{ id: string; studentName: string; year: string; term1: number; term2: number; term3: number; note: string }[]>([]);
  const [originalData, setOriginalData] = useState<{ id: string; studentName: string; year: string; term1: number; term2: number; term3: number; note: string }[]>([]);
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const { data: attentions = [] } = useQuery({
    queryKey: ['attentions', selectedInstituteId, selectedClassId],
    queryFn: () => getAttentions({ instituteId: selectedInstituteId || undefined, classId: selectedClassId || undefined }),
  });

  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
  });

  const { data: filteredClasses = [] } = useQuery({
    queryKey: ['classesForInstitute', selectedInstituteId],
    queryFn: () => getClassesForInstitute(selectedInstituteId!),
    enabled: !!selectedInstituteId,
  });

  const addMutation = useMutation({
    mutationFn: addAttention,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attentions'] });
      toast.success('Attention added');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateAttentions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attentions'] });
      toast.success('Attentions updated');
      setEditMode(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const form = useForm({
    resolver: zodResolver(addAttentionSchema),
    defaultValues: { studentId: '', year: new Date().getFullYear().toString(), term: '1', attention: 0, note: '' },
  });

  const [selectedInstituteInDialog, setSelectedInstituteInDialog] = useState<string>('');
  const [selectedClassInDialog, setSelectedClassInDialog] = useState<string>('');
  const { data: filteredClassesInDialog = [] } = useQuery({
    queryKey: ['classesForInstituteDialog', selectedInstituteInDialog],
    queryFn: () => getClassesForInstitute(selectedInstituteInDialog),
    enabled: !!selectedInstituteInDialog,
  });

  const { data: filteredStudents = [] } = useQuery({
    queryKey: ['studentsForClass', selectedClassInDialog],
    queryFn: () => getStudentsForClass(selectedClassInDialog!),
    enabled: !!selectedClassInDialog,
  });

  const onAddSubmit = (data: any) => {
    addMutation.mutate(data);
    form.reset();
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditedData(originalData);
    } else {
      const normalized = attentions.map(a => ({
        id: a.id,
        studentName: String(a.studentName ?? ''),
        note: a.note ?? '',
        year: a.year,
        term1: a.term1 ?? 0,
        term2: a.term2 ?? 0,
        term3: a.term3 ?? 0,
      }));
      setOriginalData(normalized);
      setEditedData([...normalized]);
    }
    setEditMode(!editMode);
  };

  const handleEditChange = (id: string, field: 'term1' | 'term2' | 'term3' | 'note' | 'year', value: number | string) => {
    setEditedData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const onSave = () => {
    updateMutation.mutate(editedData);
  };

  const onCancel = () => {
    setEditedData(originalData);
    setEditMode(false);
  };

  return (
    <div>
      <div className="flex gap-4 mb-4 justify-end">
        <Select onValueChange={setSelectedInstituteId}>
          <SelectTrigger>
            <SelectValue placeholder="Institute" />
          </SelectTrigger>
          <SelectContent>
            {institutes.map(inst => (
              <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={setSelectedClassId}>
          <SelectTrigger>
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            {filteredClasses.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Attention</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Attention</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                <Select onValueChange={setSelectedInstituteInDialog}>
                  <SelectTrigger>
                    <SelectValue placeholder="Institute" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutes.map(inst => (
                      <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={setSelectedClassInDialog}>
                  <SelectTrigger>
                    <SelectValue placeholder="Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClassesInDialog.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormField control={form.control} name="studentId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student</FormLabel>
                    <Select onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Student" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStudents.map(stu => (
                          <SelectItem key={stu.id} value={stu.id}>{stu.name as string}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="term" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Term</FormLabel>
                    <Select onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Term" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="attention" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attention</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="note" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit">Save</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Button variant={editMode ? 'secondary' : 'default'} onClick={toggleEditMode}>
          {editMode ? 'Editing...' : 'Edit All'}
        </Button>

        {editMode && (
          <div className="flex gap-2">
            <Button onClick={onSave}>Save</Button>
            <Button variant="destructive" onClick={onCancel}>Cancel</Button>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Term 1 Attention</TableHead>
            <TableHead>Term 2 Attention</TableHead>
            <TableHead>Term 3 Attention</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(editMode ? editedData : attentions).map(row => (
            <TableRow key={row.id}>
              <TableCell>{row.studentName as string}</TableCell>
              <TableCell>
                {editMode ? <Input value={row.year} onChange={e => handleEditChange(row.id, 'year', e.target.value)} /> : row.year}
              </TableCell>
              <TableCell>
                {editMode ? <Input value={row.term1 || 0} onChange={e => handleEditChange(row.id, 'term1', parseInt(e.target.value))} /> : row.term1}
              </TableCell>
              <TableCell>
                {editMode ? <Input value={row.term2 || 0} onChange={e => handleEditChange(row.id, 'term2', parseInt(e.target.value))} /> : row.term2}
              </TableCell>
              <TableCell>
                {editMode ? <Input value={row.term3 || 0} onChange={e => handleEditChange(row.id, 'term3', parseInt(e.target.value))} /> : row.term3}
              </TableCell>
              <TableCell>
                {editMode ? <Input value={row.note || ""} onChange={e => handleEditChange(row.id, 'note', e.target.value)} /> : row.note}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

    </div>
  );
};

export default AttentionTab;