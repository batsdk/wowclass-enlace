'use client';

import { useUser } from '@/lib/useUser';
import { useQuery } from '@tanstack/react-query';
import { getPublishedExams } from '@/lib/mcqActions';
import { getStudentInstitutes, getStudentClassesForExams } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, PlayCircle, Filter } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ExamList() {
  const { data: user } = useUser();
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Fetch student's institutes
  const { data: institutes = [] } = useQuery({
    queryKey: ['studentInstitutes'],
    queryFn: getStudentInstitutes,
    enabled: !!user && user.role === 'student'
  });

  // Fetch student's classes for selected institute
  const { data: classes = [] } = useQuery({
    queryKey: ['studentClasses', selectedInstId],
    queryFn: () => getStudentClassesForExams(selectedInstId || undefined),
    enabled: !!user && user.role === 'student'
  });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['availableExams', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      return getPublishedExams(selectedClassId);
    },
    enabled: !!user && user.role === 'student' && !!selectedClassId
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Online Exams</h1>
          <p className="text-gray-500 mt-1">Available interactive exams for your classes</p>
        </div>

        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>

          <Select value={selectedInstId || ''} onValueChange={(val) => {
            setSelectedInstId(val);
            setSelectedClassId(null);
          }}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Institute" />
            </SelectTrigger>
            <SelectContent>
              {institutes.map(inst => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClassId || ''} onValueChange={setSelectedClassId} disabled={!selectedInstId}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedClassId ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Select a class to see exams</h3>
          <p className="text-gray-500">Pick an institute and a class to view your available papers.</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-20">Loading exams...</div>
      ) : exams.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No exams available for this class</h3>
          <p className="text-gray-500">Check back later or ask your teacher.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow border-indigo-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold text-gray-900">{exam.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {exam.duration} mins
                    </span>
                  </div>
                </div>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                  <Link href={`/exam/${exam.id}`}>
                    <PlayCircle className="w-4 h-4 mr-2" /> Start Exam
                  </Link>
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
