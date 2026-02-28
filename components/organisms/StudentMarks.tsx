'use client';
import { useQuery } from '@tanstack/react-query';
import { getMarksForStudent } from '@/lib/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type StudentMarksProps = {
  id: string; // Student ID
  selectedYear: string;
  selectedTerm: string;
};

type Mark = {
  paperName: string;
  term: string;
  marks: number;
  isMcq?: boolean;
};

export default function StudentMarks({ id :studentId, selectedTerm, selectedYear }: StudentMarksProps) {

  const { data: marks = [] } = useQuery({
    queryKey: ['marksForStudent', studentId, selectedYear],
    queryFn: () => getMarksForStudent(studentId, selectedYear),
    enabled: !!studentId,
  });

  const filteredMarks = selectedTerm === "all"
    ? marks
    : marks.filter(m => m.term === selectedTerm);

  const getGrade = (marksScored: number) => {
    if (marksScored >= 75) return 'A';
    if (marksScored >= 65) return 'B';
    if (marksScored >= 55) return 'C';
    if (marksScored >= 35) return 'S';
    return 'W';
  };

  const getRank = (marksScored: number) => {
    if (marksScored > 85) return 10;
    if (marksScored >= 75) return 9;
    if (marksScored >= 70) return 8;
    if (marksScored >= 65) return 7;
    if (marksScored >= 55) return 6;
    if (marksScored >= 45) return 5;
    if (marksScored >= 40) return 4;
    if (marksScored >= 30) return 3;
    return 2;
  };

  const totalMarks = filteredMarks.reduce((sum, m) => sum + (m.marks || 0), 0);

  return (
    <div className="space-y-4">
      {/* <h2 className="text-2xl font-bold">Marks</h2> */}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paper Name</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Marks Scored</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Rank</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMarks.map(m => (
            <TableRow key={`${m.paperName}-${m.term}-${m.isMcq}`}>
              <TableCell>{m.paperName}{m.isMcq ? " (MCQ)" : ""}</TableCell>
              <TableCell>{m.term}</TableCell>
              <TableCell>{m.marks}</TableCell>
              <TableCell>{m.marks ? getGrade(m.marks) : "-"}</TableCell>
              <TableCell>{m.marks ? getRank(m.marks) : "-"}</TableCell>
            </TableRow>
          ))}
          {/* <TableRow>
            <TableCell colSpan={4} className="text-right font-bold">Total Marks</TableCell>
            <TableCell className="font-bold">{totalMarks}</TableCell>
          </TableRow> */}
        </TableBody>
      </Table>
    </div>
  );
}