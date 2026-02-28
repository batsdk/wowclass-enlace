'use client';

import { useUser } from '@/lib/useUser';
import { useQuery } from '@tanstack/react-query';
import { getStudentProgress } from '@/lib/actions';
import { redirect, useParams } from 'next/navigation';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';
import StudentMetrics from '../organisms/StudentMetrics';
import StudentMarks from '../organisms/StudentMarks';
import { useRef, useState } from 'react';
import { Button } from '../ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Props = {
  id: string;
}

export default function StudentReport({ id }: Props) {

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const reportRef = useRef<HTMLDivElement>(null);


  const { data: user, isLoading: userLoading } = useUser();
  const { data: progress, isLoading } = useQuery({
    queryKey: ['studentProgress', id],
    queryFn: () => getStudentProgress(id),
  });

  if (userLoading || isLoading) return <div>Loading...</div>;
  if (!user) redirect('/auth/signin');
  if (user.role === 'student' && user.id !== id) redirect('/dashboard');
  if (!progress) return <div>Progress not found</div>;

  const { student, attendancePercentage, attentions, marks, classes } = progress;

  // const handleDownloadPDF = async () => {
  //   window.open('/ScienceSKPD.pdf', '_blank');
  // };

  // Attendance Chart Data
  const attendanceData = {
    labels: ['Attended', 'Absent'],
    datasets: [{
      data: [attendancePercentage, 100 - attendancePercentage],
      backgroundColor: ['#36A2EB', '#FF6384'],
      hoverOffset: 4,
    }],
  };

  // Attention Chart Data
  // const attentionData = {
  //   labels: attentions.map(a => `${a.year} - Term ${a.term1}`),
  //   datasets: [{
  //     label: 'Attention (%)',
  //     data: attentions.map(a => ((a?.term1 || 0) + (a?.term2 || 0) + (a?.term3 || 0)) / 3 || 0),
  //     backgroundColor: '#4BC0C0',
  //   }],
  // };

  // Marks Chart Data
  const marksData = {
    labels: marks.map(m => `${m.paperName} (Term ${m.term})`),
    datasets: [{
      label: 'Marks',
      data: marks.map(m => m.marks || 0),
      backgroundColor: '#FFCE56',
    }],
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Progress Report - {student.firstName} {student.lastName}</h1>

      {/* Year and Term Dropdown */}
      <div className="flex gap-4 mb-4">
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

        <Select onValueChange={setSelectedTerm} value={selectedTerm}>
          <SelectTrigger>
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            {['1', '2', '3'].map(term => (
              <SelectItem key={term} value={term}>{term}</SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>


      <div className='grid md:grid-cols-2 grid-cols-1' >
        <StudentMetrics id={id} selectedTerm={selectedTerm} selectedYear={selectedYear} />
        <StudentMarks id={id} selectedTerm={selectedTerm} selectedYear={selectedYear} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <Pie data={attendanceData} />
            <p className="mt-2">Attendance: {attendancePercentage.toFixed(1)}%</p>
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader>
            <CardTitle>Attention Average</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={attentionData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </CardContent>
        </Card> */}
        <Card>
          <CardHeader>
            <CardTitle>Marks Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={marksData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader>
            <CardTitle>Enrolled Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.map(cls => (
              <Badge key={cls.classId} variant="secondary" className="mr-2 mb-2">
                {cls.className}
              </Badge>
            ))}
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}