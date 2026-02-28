'use client';

import { useUser } from '@/lib/useUser';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttentionTab from '@/components/organisms/AttentionTab';
import AttendanceTab from '@/components/organisms/AttendanceTab';
import MarksTab from '@/components/organisms/MarksTab';
import StudentReport from '@/components/templates/StudentReport';

export default function Dashboard() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) redirect('/auth/signin');

  const role = user.role;

  if (role === 'student') {
    return (
      <div className="p-4">
        <StudentReport id={user.id} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <Tabs defaultValue="attention" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attention">Attention</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
        </TabsList>
        <TabsContent value="attention">
          <AttentionTab />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab />
        </TabsContent>
        <TabsContent value="marks">
          <MarksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}