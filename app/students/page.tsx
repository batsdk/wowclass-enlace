'use client';

import { useUser } from '@/lib/useUser';
import { redirect, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, addStudent, getStudentClasses, addStudentToClass, removeStudentFromClass, getTeacherInstitutes, getClassesForInstitute, updateStudents } from '@/lib/actions'; // Add updateStudents
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addStudentSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import useBulkAddStudents from '@/hooks/useBulkStudents';
import 'dotenv/config';
import Link from 'next/link';


export default function Students() {
  const { data: user, isLoading } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<{ id: string; username: string; firstName: string; lastName: string; school: string }[]>([]);
  const [originalData, setOriginalData] = useState<{ id: string; username: string; firstName: string; lastName: string; school: string }[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState([{ firstName: '', lastName: '', school: '', username: '', password: '', image: null as File | null, imageUrl: '' }]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchUsername);
    }, 500); // Debounce delay 500ms

    return () => clearTimeout(timer);
  }, [searchUsername]);


  const { data: students = [] } = useQuery({
    queryKey: ['students', debouncedSearch, selectedInstituteId, selectedClassId],
    queryFn: () => getStudents({
      instituteId: selectedInstituteId || undefined,
      classId: selectedClassId || undefined,
      username: debouncedSearch,
    }),
    enabled: !!user && user.role === 'teacher',
  });


  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
    enabled: !!user && user.role === 'teacher',
  });

  const { data: filteredClasses = [] } = useQuery({
    queryKey: ['classesForInstitute', selectedInstituteId],
    queryFn: () => getClassesForInstitute(selectedInstituteId!),
    enabled: !!selectedInstituteId,
  });

  const addMutation = useMutation({
    mutationFn: addStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student added');
    },
    onError: (error: any) => toast.error('Failed to add student'),
  });

  const updateMutation = useMutation({
    mutationFn: updateStudents,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Students updated');
      setEditMode(false);
    },
    onError: (error: any) => toast.error('Failed to update students'),
  });

  const form = useForm({
    resolver: zodResolver(addStudentSchema),
    defaultValues: { username: '', firstName: '', lastName: '', school: '', password: '' },
  });

  const onAddSubmit = (data: any) => {
    addMutation.mutate(data);
    form.reset();
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    form.setValue('password', pass);
  };

  const copyPassword = async (pass: string) => {
    await navigator.clipboard.writeText(pass);
    toast.success('Password copied');
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditedData(originalData);
    } else {
      setOriginalData(students.map(stu => ({
        id: stu.id,
        username: stu.username,
        firstName: stu.firstName,
        lastName: stu.lastName,
        school: stu.school,
      })));
      setEditedData(students.map(stu => ({
        id: stu.id,
        username: stu.username,
        firstName: stu.firstName,
        lastName: stu.lastName,
        school: stu.school,
      })));
    }
    setEditMode(!editMode);
  };

  const handleEditChange = (id: string, field: 'username' | 'firstName' | 'lastName' | 'school', value: string) => {
    setEditedData(prev => prev.map(stu => stu.id === id ? { ...stu, [field]: value } : stu));
  };

  const onSave = () => {
    updateMutation.mutate(editedData);
  };

  const onCancel = () => {
    setEditedData(originalData);
    setEditMode(false);
  };

  // Manage Classes Modal Logic (unchanged)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [addedClasses, setAddedClasses] = useState<{ classId: string; className: string }[]>([]);
  // const [selectedInstitute, setSelectedInstitute] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');


  const loadStudentClasses = async (studentId: string) => {
    setSelectedStudentId(studentId);
    const classes = await getStudentClasses(studentId);
    setAddedClasses(classes);
  };

  const handleAddClass = async () => {
    if (selectedClass && !addedClasses.find(c => c.classId === selectedClass)) {
      const className = filteredClasses.find(c => c.id === selectedClass)?.name || 'Unknown';
      setAddedClasses([...addedClasses, { classId: selectedClass, className }]);
      await addStudentToClass(selectedStudentId!, selectedClass); // Optional: Add immediately or on save
      setSelectedClass('');
    }
  };

  const handleRemoveClass = async (classId: string) => {
    setAddedClasses(addedClasses.filter(c => c.classId !== classId));
    await removeStudentFromClass(selectedStudentId!, classId); // Remove immediately
  };

  const saveStudentClasses = async () => {
    toast.success('Classes updated for student');
    setSelectedStudentId(null);
  };

  // First, define the type for your bulk row
  type BulkRow = {
    firstName: string;
    lastName: string;
    school: string;
    username: string;
    password: string;
    image: File | null;
    imageUrl: string;
  };

  // Type the field parameter as a key of BulkRow
  const handleBulkChange = (
    index: number,
    field: keyof BulkRow,
    value: string | File
  ) => {
    const updated = [...bulkRows];

    if (field === 'image' && value instanceof File) {
      updated[index][field] = value;
    } else if (field !== 'image') {
      // TypeScript now knows these fields accept strings
      updated[index][field] = value as string;
    }

    setBulkRows(updated);
  };

  const addBulkRow = () => setBulkRows([...bulkRows, { firstName: '', lastName: '', school: '', username: '', password: '', image: null, imageUrl: '' }]);

  const removeBulkRow = (index: number) => setBulkRows(bulkRows.filter((_, i) => i !== index));

  const bulkAddMutation = useBulkAddStudents();

  const onBulkSubmit = async () => {
    const validRows = bulkRows.filter(row => row.username && row.password && row.firstName && row.lastName && row.school);

    const updatedRows = await Promise.all(validRows.map(async (row) => {
      let imageUrl: string | undefined = undefined;

      if (row.image) {
        const formData = new FormData();
        formData.append('file', row.image);
        formData.append('upload_preset', 'sciencesk_student_uploads');
        const response = await axios.post(`https://api.cloudinary.com/v1_1/batzdk/image/upload`, formData);
        imageUrl = response.data.secure_url;
      }

      return {
        username: row.username,
        firstName: row.firstName,
        lastName: row.lastName,
        school: row.school,
        password: row.password,
        imageUrl,
      };
    }));

    // Now pass the array to bulk mutation
    try {
      bulkAddMutation.mutate(updatedRows);
      toast("Successfully, Added students");
    } catch (error) {
      toast("Error in adding students");
      console.log(error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Students</h1>

        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button className='mr-3'>Add Student</Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Add Student</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="school" render={({ field }) => (
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                      <Button type="button" variant="secondary" onClick={generatePassword} className="mt-2">Generate</Button>
                      <Button type="button" variant="secondary" onClick={() => copyPassword(field.value)} className="mt-2 ml-2">Copy</Button>
                    </FormItem>
                  )} />
                  <Button type="submit">Submit</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button>Bulk Add Students</Button>
            </DialogTrigger>
            <DialogContent className="
    w-screen h-screen max-w-none m-0 rounded-none border-0 p-0
    md:w-[90vw] md:h-[90vh] md:max-w-4xl md:rounded-lg md:border md:m-auto
  ">
              <DialogHeader>
                <DialogTitle>Bulk Add Students</DialogTitle>
              </DialogHeader>
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Image (optional)</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkRows.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input value={row.firstName} onChange={(e) => handleBulkChange(index, 'firstName', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input value={row.lastName} onChange={(e) => handleBulkChange(index, 'lastName', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input value={row.school} onChange={(e) => handleBulkChange(index, 'school', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input value={row.username} onChange={(e) => handleBulkChange(index, 'username', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input value={row.password} onChange={(e) => handleBulkChange(index, 'password', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <input
                              ref={(el) => {
                                if (el) {
                                  // Store reference for each input
                                  (window as any)[`fileInput_${index}`] = el;
                                }
                              }}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleBulkChange(index, 'image', file);
                                }
                              }}
                              className="hidden"
                            />
                            <Button
                              variant="outline"
                              type="button"
                              onClick={() => {
                                const input = (window as any)[`fileInput_${index}`];
                                if (input) input.click();
                              }}
                            >
                              Upload Image
                            </Button>
                          </div>
                          {row.image && <p className="text-sm mt-1">{"Image Uploaded"}</p>}
                        </TableCell>
                        <TableCell>
                          <Button variant="destructive" onClick={() => removeBulkRow(index)} disabled={bulkRows.length === 1}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button onClick={addBulkRow}>Add Row</Button>
                <Button onClick={onBulkSubmit}>Submit Bulk</Button>
              </div>
            </DialogContent>
          </Dialog>
        </section>


      </div>

      <div className="flex flex-wrap gap-4 items-end justify-end mb-4">
        {/* Institute Dropdown */}
        <div className="min-w-[200px]">
          <Select onValueChange={value => setSelectedInstituteId(value === 'all' ? null : value)} value={selectedInstituteId || 'all'}>
            <SelectTrigger className="w-full">
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
        {/* Class Dropdown */}
        <div className="min-w-[200px]">
          <Select
            onValueChange={value => setSelectedClassId(value === 'all' ? null : value)}
            value={selectedClassId || 'all'}
            disabled={!selectedInstituteId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={selectedInstituteId ? 'Filter by Class' : 'Select Institute first'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {filteredClasses.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Username Search Input */}
        <div className="min-w-[200px]">
          <Input
            placeholder="Search by username"
            value={searchUsername}
            onChange={e => setSearchUsername(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Edit All */}
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
              <TableHead>Username</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(editMode ? editedData : students).map(student => (
              <TableRow key={student.id}>
                <TableCell>
                  {editMode ? <Input value={student.username} onChange={(e) => handleEditChange(student.id, 'username', e.target.value)} /> : <Link className='cursor-pointer' href={`/profile/${student.id}`}>{student.username}</Link>}
                </TableCell>
                <TableCell>
                  {editMode ? <Input value={student.firstName} onChange={(e) => handleEditChange(student.id, 'firstName', e.target.value)} /> : student.firstName}
                </TableCell>
                <TableCell>
                  {editMode ? <Input value={student.lastName} onChange={(e) => handleEditChange(student.id, 'lastName', e.target.value)} /> : student.lastName}
                </TableCell>
                <TableCell>
                  {editMode ? <Input value={student.school} onChange={(e) => handleEditChange(student.id, 'school', e.target.value)} /> : student.school}
                </TableCell>
                <TableCell>
                  <Button onClick={() => loadStudentClasses(student.id)}>Manage Classes</Button>
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

      {/* Manage Classes Modal */}
      {selectedStudentId && (
        <Dialog open={!!selectedStudentId} onOpenChange={() => setSelectedStudentId(null)}>
          <DialogContent className="w-[90vw] max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Manage Classes for Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select onValueChange={setSelectedInstituteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Institute" />
                </SelectTrigger>
                <SelectContent>
                  {institutes.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={setSelectedClass} value={selectedClass}>
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
              <Button onClick={saveStudentClasses}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}