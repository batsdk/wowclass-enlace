'use client';

import { useUser } from '@/lib/useUser';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { getTeacherInstitutes, getClassesForInstitute, getStudentsForClass, getAttendanceForStudent, getMarksForStudent } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function Reports() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user || user.role !== 'teacher') redirect('/dashboard');

  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [attendanceView, setAttendanceView] = useState<'monthly' | 'weekly'>('monthly');

  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
  });

  const { data: filteredClasses = [] } = useQuery({
    queryKey: ['classesForInstitute', selectedInstituteId],
    queryFn: () => getClassesForInstitute(selectedInstituteId!),
    enabled: !!selectedInstituteId,
  });

  const { data: filteredStudents = [] } = useQuery({
    queryKey: ['studentsForClass', selectedClassId],
    queryFn: () => getStudentsForClass(selectedClassId!),
    enabled: !!selectedClassId,
  });

  const { data: attendanceData = [] } = useQuery({
    queryKey: ['attendanceForStudent', selectedStudentId, attendanceView, selectedYear],
    queryFn: () => getAttendanceForStudent(selectedStudentId!, attendanceView, selectedYear),
    enabled: !!selectedStudentId,
  });

  const { data: marksData = [] } = useQuery({
    queryKey: ['marksForStudent', selectedStudentId, selectedYear],
    queryFn: () => getMarksForStudent(selectedStudentId!, selectedYear),
    enabled: !!selectedStudentId,
  });

  // Prepare attendance chart data based on view
  const attendanceChartData = {
    labels: attendanceView === 'monthly'
      ? Array.from({ length: 12 }, (_, i) => `${i + 1}/${selectedYear}`)
      : attendanceData.map(d => format((d as any).date, 'MMM dd')),
    datasets: [{
      label: 'Attendance',
      data: attendanceView === 'monthly'
        ? Array.from({ length: 12 }, (_, i) => {
          const monthStart = startOfMonth(new Date(parseInt(selectedYear), i, 1));
          const monthEnd = endOfMonth(monthStart);
          const monthAttendance = attendanceData.filter(d => (d as any).date >= monthStart && (d as any).date <= monthEnd);
          return monthAttendance.length > 0 ? (monthAttendance.filter(d => (d as any).attended).length / monthAttendance.length) * 100 : 0;
        })
        : attendanceData.map(d => (d as any).attended ? 1 : 0),
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
    }],
  };

  const marksChartData = {
    labels: marksData.map(m => `${m.paperName} (Term ${m.term})`),
    datasets: [{
      label: 'Marks',
      data: marksData.map(m => m.marks),
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
    }],
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <div className="flex gap-4 mb-4">
            <Select onValueChange={setSelectedInstituteId} value={selectedInstituteId ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder="Institute" />
              </SelectTrigger>
              <SelectContent>
                {institutes.map(inst => (
                  <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedClassId} value={selectedClassId ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {filteredClasses.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedStudentId} value={selectedStudentId ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder="Student" />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map(stu => (
                  <SelectItem key={stu.id} value={stu.id}>{stu.name as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => setAttendanceView(value as 'monthly' | 'weekly')} value={attendanceView}>
              <SelectTrigger>
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedStudentId && (
            <Bar data={attendanceChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          )}
        </TabsContent>
        <TabsContent value="marks">
          <div className="flex gap-4 mb-4">
            <Select onValueChange={setSelectedInstituteId} value={selectedInstituteId ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder="Institute" />
              </SelectTrigger>
              <SelectContent>
                {institutes.map(inst => (
                  <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedClassId} value={selectedClassId ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {filteredClasses.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedStudentId} value={selectedStudentId ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder="Student" />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map(stu => (
                  <SelectItem key={stu.id} value={stu.id}>{stu.name as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedYear} value={selectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {['2023', '2024', '2025', '2026'].map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedStudentId && (
            <Line data={marksChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}