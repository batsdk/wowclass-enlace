'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
// import { useRouter } from 'next/router';
import { z } from 'zod';
import { useUser } from '@/lib/useUser';

// If you don't have access to your original schemas, here are example schemas
const teacherLoginSchema = z.object({
  identifier: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  role: z.literal('teacher'),
});

const studentLoginSchema = z.object({
  identifier: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.literal('student'),
});

// Infer types from schemas
type TeacherFormData = z.infer<typeof teacherLoginSchema>;
type StudentFormData = z.infer<typeof studentLoginSchema>;

export default function SignIn() {

  const { data: user, isLoading } = useUser();

  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const router = useRouter();

  const teacherForm = useForm<TeacherFormData>({
    resolver: zodResolver(teacherLoginSchema),
    defaultValues: { 
      identifier: '', 
      password: '', 
      role: 'teacher' as const 
    },
  });

  const studentForm = useForm<StudentFormData>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { 
      identifier: '', 
      password: '', 
      role: 'student' as const 
    },
  });

  const currentForm = role === 'teacher' ? teacherForm : studentForm;

  const handleRoleChange = (value: string) => {
    const newRole = value as 'teacher' | 'student';
    setRole(newRole);
  };

  const onSubmit = async (data: TeacherFormData | StudentFormData) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        currentForm.setError('root', { 
          message: errorData.message || 'Invalid credentials' 
        });
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      currentForm.setError('root', { 
        message: 'Network error. Please try again.' 
      });
    }
  };

  useEffect(() => {
    if(user){
      router.push("/dashboard")
    }
  }, [user])

  if(isLoading){
    return <div>Loading...</div>
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="teacher" onValueChange={handleRoleChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teacher">Teacher</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
            </TabsList>
            <TabsContent value="teacher">
              <Form {...teacherForm}>
                <form onSubmit={teacherForm.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={teacherForm.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teacherForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teacherForm.control}
                    name="role"
                    render={({ field }) => (
                      <input type="hidden" {...field} />
                    )}
                  />
                  {teacherForm.formState.errors.root && (
                    <div className="text-sm text-red-600">
                      {teacherForm.formState.errors.root.message}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={teacherForm.formState.isSubmitting}
                  >
                    {teacherForm.formState.isSubmitting ? 'Logging in...' : 'Login as Teacher'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="student">
              <Form {...studentForm}>
                <form onSubmit={studentForm.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={studentForm.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={studentForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={studentForm.control}
                    name="role"
                    render={({ field }) => (
                      <input type="hidden" {...field} />
                    )}
                  />
                  {studentForm.formState.errors.root && (
                    <div className="text-sm text-red-600">
                      {studentForm.formState.errors.root.message}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={studentForm.formState.isSubmitting}
                  >
                    {studentForm.formState.isSubmitting ? 'Logging in...' : 'Login as Student'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}