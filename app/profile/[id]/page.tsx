'use client';

import { useUser } from '@/lib/useUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateStudent, addStudentToClass, removeStudentFromClass, getClassesForInstitute, getTeacherInstitutes } from '@/lib/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateStudentSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function Profile() {
  const params = useParams();
  const id = params.id as string;

  const { data: user, isLoading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [addedClasses, setAddedClasses] = useState<{ classId: string; className: string }[]>([]);

  if (!user) redirect('/auth/signin');
  if (user.role === 'student' && user.id !== id) redirect('/dashboard');

  const { data: profile } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => getProfile(id),
  });

  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
    enabled: user.role === 'teacher',
  });

  const { data: filteredClasses = [] } = useQuery({
    queryKey: ['classesForInstitute', selectedInstitute],
    queryFn: () => getClassesForInstitute(selectedInstitute),
    enabled: !!selectedInstitute && user.role === 'teacher',
  });

  const updateMutation = useMutation({
    mutationFn: updateStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', id] });
      toast.success('Profile updated');
      setEditMode(false);
    },
  });

  const form = useForm({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: { id, firstName: '', lastName: '', username: '', school: '', email: '', imageUrl: '' },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        id,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        username: profile.username || '',
        school: profile.school || '',
        email: profile.email || '',
        imageUrl: profile.image || '',
      });
    }
  }, [profile, form, id]);

  const handleAddClass = async () => {
    if (selectedClass && profile && !profile.classes.find(c => c.classId === selectedClass)) {
      const className = filteredClasses.find(c => c.id === selectedClass)?.name || 'Unknown';
      setAddedClasses([...(profile.classes ?? []), { classId: selectedClass, className }]); // Use ?? to default to empty array
      await addStudentToClass(id, selectedClass);
      queryClient.invalidateQueries({ queryKey: ['profile', id] });
      setSelectedClass('');
    }
  };

  const handleRemoveClass = async (classId: string) => {
    if (profile?.classes) {
      setAddedClasses(profile.classes.filter(c => c.classId !== classId));
    } else {
      setAddedClasses([]); // Default to empty array if profile.classes is unavailable
    }
    await removeStudentFromClass(id, classId);
    queryClient.invalidateQueries({ queryKey: ['profile', id] });
  };

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  if (userLoading) return <div>Loading...</div>;
  if (!profile) return <div>Profile not found</div>;

  
  return (

    <div className="p-4">
      <div className="flex gap-4">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <img src={profile.image || '/placeholder.svg'} alt="Profile Image" className="w-32 h-32 rounded-full object-cover" />
        <div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input disabled={!editMode} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input disabled={!editMode} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl><Input disabled={!editMode} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (for notifications)</FormLabel>
                  <FormControl><Input disabled={!editMode} type="email" placeholder="email@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="school" render={({ field }) => (
                <FormItem>
                  <FormLabel>School</FormLabel>
                  <FormControl><Input disabled={!editMode} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex gap-2">
                {editMode && (
                  <>
                    <Button type="submit">Save Changes</Button>
                    <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  </>
                )}
              </div>
            </form>
          </Form>
          {!editMode && (
            <Button type="button" className="mt-4" onClick={() => setEditMode(true)}>Edit Profile</Button>
          )}
        </div>
      </div>

      <h2 className="text-xl font-bold mt-8">Classes</h2>
      <div className="flex flex-wrap gap-2 mt-4">
        {profile.classes.map(cls => (
          <Badge key={cls.classId} variant="secondary">
            {cls.className}
            {user.role === 'teacher' && <X className="ml-2 cursor-pointer" onClick={() => handleRemoveClass(cls.classId)} />}
          </Badge>
        ))}
      </div>

      {/* FORCED COMMENT */}
      {user.role === 'teacher' && (
        <div className="mt-4 flex gap-2">
          <Select onValueChange={setSelectedInstitute}>
            <SelectTrigger>
              <SelectValue placeholder="Institute" />
            </SelectTrigger>
            <SelectContent>
              {institutes.map(inst => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              {filteredClasses.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddClass} disabled={!selectedClass}>Add Class</Button>
        </div>
      )}
    </div>
  );
}