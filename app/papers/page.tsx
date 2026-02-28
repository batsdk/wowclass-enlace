'use client';

import { useUser } from '@/lib/useUser';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPapers, addPaper, updatePapers, getPaperClasses, addPaperToClass, removePaperFromClass, getPaperTypes, addPaperType, getTeacherInstitutes, getClassesForInstitute } from '@/lib/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addPaperSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns'; // For date formatting; npm install date-fns
import { Checkbox } from '@/components/ui/checkbox';


export default function Papers() {
  const { data: user, isLoading } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<{ id: string; name: string; date: Date }[]>([]);
  const [originalData, setOriginalData] = useState<{ id: string; name: string; date: Date }[]>([]);
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<'1' | '2' | '3' | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);


  const { data: papers = [] } = useQuery({
    queryKey: ['papers', selectedInstituteId, selectedClassId, selectedTerm],
    queryFn: () => getPapers({ instituteId: selectedInstituteId || undefined, classId: selectedClassId || undefined, term: selectedTerm || undefined }),
    enabled: !!user && user.role === 'teacher',
  });

  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
    enabled: !!user && user.role === 'teacher',
  });

  const [addPaperInstituteId, setAddPaperInstituteId] = useState<string | null>(null);

  const { data: filteredClasses = [] } = useQuery({
    queryKey: ['classesForInstitute', addPaperInstituteId],
    queryFn: () => getClassesForInstitute(addPaperInstituteId!),
    enabled: !!addPaperInstituteId,
  });

  const addMutation = useMutation({
    mutationFn: addPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success('Paper added');
    },
    onError: (error: any) => toast.error('Failed to add paper'),
  });

  const updateMutation = useMutation({
    mutationFn: updatePapers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success('Papers updated');
      setEditMode(false);
    },
    onError: (error: any) => toast.error('Failed to update papers'),
  });

  const form = useForm({
    resolver: zodResolver(addPaperSchema),
    defaultValues: { name: '', date: new Date(), term: '1', typeId: '', classIds: [] },
  });

  const onAddSubmit = (data: any) => {
    addMutation.mutate(data);
    form.reset();
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditedData(originalData);
    } else {
      setOriginalData(papers.map(p => ({ id: p.id, name: p.name, date: p.date })));
      setEditedData(papers.map(p => ({ id: p.id, name: p.name, date: p.date })));
    }
    setEditMode(!editMode);
  };

  const handleEditChange = (id: string, field: 'name' | 'date', value: string | Date) => {
    setEditedData(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const onSave = () => {
    updateMutation.mutate(editedData);
  };

  const onCancel = () => {
    setEditedData(originalData);
    setEditMode(false);
  };

  // Manage Paper Modal
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [addedClasses, setAddedClasses] = useState<{ classId: string; className: string }[]>([]);
  const [selectedInstitute, setSelectedInstitute] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const { data: paperTypes = [] } = useQuery({
    queryKey: ['paperTypes', selectedClass],
    queryFn: () => getPaperTypes({ classId: selectedClass }),
    enabled: !!user && user.role === 'teacher',
  });

  const loadPaperClasses = async (paperId: string) => {
    setSelectedPaperId(paperId);
    const classes = await getPaperClasses(paperId);
    setAddedClasses(classes);
  };

  const handleAddClass = async () => {
    if (selectedClass && !addedClasses.find(c => c.classId === selectedClass)) {
      const className = filteredClasses.find(c => c.id === selectedClass)?.name || 'Unknown';
      setAddedClasses([...addedClasses, { classId: selectedClass, className }]);
      await addPaperToClass(selectedPaperId!, selectedClass);
      setSelectedClass('');
    }
  };

  const handleRemoveClass = async (classId: string) => {
    setAddedClasses(addedClasses.filter(c => c.classId !== classId));
    await removePaperFromClass(selectedPaperId!, classId);
  };

  const savePaperClasses = async () => {
    toast.success('Classes updated for paper');
    setSelectedPaperId(null);
  };

  // For dynamic paper types
  const addTypeMutation = useMutation({
    mutationFn: addPaperType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paperTypes'] });
      toast.success('Paper type added');
    },
  });

  const onAddTypeSubmit = (data: any) => {
    // If global, only send name and isGlobal
    // If not global, must have classId
    if (data.isGlobal) {
      addTypeMutation.mutate({ name: data.name, isGlobal: true });
    } else {
      addTypeMutation.mutate({ name: data.name, isGlobal: false, classId: data.classId });
    }
    typeForm.reset();
    setSelectedInstituteId(null);
  };

  const typeForm = useForm({
    defaultValues: { name: '', isGlobal: false, classId: '' },
  });

  // Watch for isGlobal and classId
  const isGlobal = typeForm.watch('isGlobal');
  const classId = typeForm.watch('classId');

  const addPaperClassIds = form.watch('classIds');
  const addPaperSelectedClassId = addPaperClassIds && addPaperClassIds.length === 1 ? addPaperClassIds[0] : undefined;

  // For paper types in Add Paper dialog, filter by selected class if only one is selected
  const { data: addPaperTypes = [] } = useQuery({
    queryKey: ['paperTypes', addPaperSelectedClassId],
    queryFn: () => getPaperTypes({ classId: addPaperSelectedClassId }),
    enabled: !!user && user.role === 'teacher',
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Papers</h1>

        <div className='flex gap-2'>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Add Paper Type</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Paper Type</DialogTitle>
              </DialogHeader>
              <Form {...typeForm}>
                <form onSubmit={typeForm.handleSubmit(onAddTypeSubmit)} className="space-y-4">
                  <FormField control={typeForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={typeForm.control} name="isGlobal" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <Checkbox checked={field.value} onCheckedChange={checked => field.onChange(!!checked)} />
                      <FormLabel>For All Classes</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {!isGlobal && (
                    <>
                      <div>
                        <FormLabel>Institute</FormLabel>
                        <Select
                          value={selectedInstituteId ?? ''}
                          onValueChange={v => {
                            setSelectedInstituteId(v);
                            // Reset classId when institute changes
                            typeForm.setValue('classId', '');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select institute" />
                          </SelectTrigger>
                          <SelectContent>
                            {institutes.map(inst => (
                              <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormField control={typeForm.control} name="classId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedInstituteId}
                          >
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
                    </>
                  )}
                  <Button type="submit" disabled={!typeForm.watch('name') || (!isGlobal && (!selectedInstituteId || !classId))}>Submit</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog >
            <DialogTrigger asChild>
              <Button>Add Paper</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Paper</DialogTitle>
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
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="term" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Term 1</SelectItem>
                          <SelectItem value="2">Term 2</SelectItem>
                          <SelectItem value="3">Term 3</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {/* Institute Dropdown */}
                  <div>
                    <FormLabel>Institute</FormLabel>
                    <Select
                      value={addPaperInstituteId ?? ''}
                      onValueChange={v => {
                        setAddPaperInstituteId(v);
                        form.setValue('classIds', []);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select institute" />
                      </SelectTrigger>
                      <SelectContent>
                        {institutes.map(inst => (
                          <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Classes Multi-Select */}
                  <FormField control={form.control} name="classIds" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classes</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {filteredClasses.map(cls => (
                          <Button
                            key={cls.id}
                            type="button"
                            variant={field.value?.includes(cls.id) ? 'default' : 'outline'}
                            onClick={() => {
                              if (field.value?.includes(cls.id)) {
                                field.onChange(field.value.filter((id: string) => id !== cls.id));
                              } else {
                                field.onChange([...(field.value || []), cls.id]);
                              }
                            }}
                            className={field.value?.includes(cls.id) ? 'bg-primary text-white' : ''}
                          >
                            {cls.name}
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {/* Paper Type Dropdown, filtered by selected class if only one selected */}
                  <FormField control={form.control} name="typeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {addPaperTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={!form.watch('name') || !addPaperInstituteId || !form.watch('classIds')?.length || !form.watch('typeId')}>Submit</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4 justify-end">
        <Select
          value={selectedInstituteId ?? 'all'}
          onValueChange={v => setSelectedInstituteId(v === 'all' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by Institute" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Institutes</SelectItem>
            {institutes.map(inst => (
              <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedClassId ?? 'all'}
          onValueChange={v => setSelectedClassId(v === 'all' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {filteredClasses.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedTerm ?? 'all'}
          onValueChange={v => setSelectedTerm(v === 'all' ? null : (v as '1' | '2' | '3'))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by Term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            <SelectItem value="1">Term 1</SelectItem>
            <SelectItem value="2">Term 2</SelectItem>
            <SelectItem value="3">Term 3</SelectItem>
          </SelectContent>
        </Select>

        <div>
          <Button variant={editMode ? 'secondary' : 'default'} onClick={toggleEditMode}>
            {editMode ? 'Editing...' : 'Edit All'}
          </Button>
        </div>

      </div>


      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(editMode ? editedData : papers).map(paper => (
              <TableRow key={paper.id}>
                <TableCell>
                  {editMode ? <Input value={paper.name} onChange={(e) => handleEditChange(paper.id, 'name', e.target.value)} /> : paper.name}
                </TableCell>
                <TableCell>
                  {editMode ? <Input type="date" value={format(paper.date, 'yyyy-MM-dd')} onChange={(e) => handleEditChange(paper.id, 'date', new Date(e.target.value))} /> : format(paper.date, 'yyyy-MM-dd')}
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" onClick={() => loadPaperClasses(paper.id)}>Manage</Button>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/mcq-manager?paperId=${paper.id}`)}>MCQs</Button>
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

      {/* Manage Modal */}
      {selectedPaperId && (
        <Dialog open={!!selectedPaperId} onOpenChange={() => setSelectedPaperId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Classes for Paper</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select onValueChange={setSelectedInstitute}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Institute" />
                </SelectTrigger>
                <SelectContent>
                  {institutes.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddClass} disabled={!selectedClass}>Add Class</Button>
              <div className="flex flex-wrap gap-2">
                {addedClasses.map(cls => (
                  <Badge key={cls.classId} variant="secondary" className="flex items-center gap-1">
                    {cls.className}
                    <X className="h-4 w-4 cursor-pointer" onClick={() => handleRemoveClass(cls.classId)} />
                  </Badge>
                ))}
              </div>
              <Button onClick={savePaperClasses}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}