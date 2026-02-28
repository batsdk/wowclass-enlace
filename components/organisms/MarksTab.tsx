'use client';

import { useUser } from '@/lib/useUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPapersForClass, getMarksForPaper, updateMarks, getTeacherInstitutes, getClassesForInstitute } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { useEffect, useState } from 'react';

const MarksTab = () => {
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<{ studentId: string; studentName: string; marks: number }[]>([]);
  const [editMode, setEditMode] = useState(false);

  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
  });

  const { data: filteredClasses = [] } = useQuery({
    queryKey: ['classesForInstitute', selectedInstituteId],
    queryFn: () => getClassesForInstitute(selectedInstituteId!),
    enabled: !!selectedInstituteId,
  });

  const { data: papers = [] } = useQuery({
    queryKey: ['papersForClass', selectedClassId],
    queryFn: () => getPapersForClass(selectedClassId!),
    enabled: !!selectedClassId,
  });

  const { data: marks = [] } = useQuery({
    queryKey: ['marksForPaper', selectedPaperId, selectedClassId],
    queryFn: () => getMarksForPaper(selectedPaperId!, selectedClassId!),
    enabled: !!selectedPaperId && !!selectedClassId,
  });

  const [marksData, setMarksData] = useState<{ studentId: string; studentName: string; marks: number }[]>([]);


  const mutation = useMutation({
    mutationFn: updateMarks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marksForPaper'] });
      toast.success('Marks updated');
      setEditMode(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleMarksChange = (studentId: string, marks: number) => {
    setMarksData(prev => prev.map(row => row.studentId === studentId ? { ...row, marks } : row));
  };

  const onSave = () => {
    const changes = marksData.map(row => ({
      paperId: selectedPaperId!,
      studentId: row.studentId,
      marks: row.marks,
    }));
    mutation.mutate(changes);
  };

  const onCancel = () => {
    setMarksData(originalData);
    setEditMode(false);
  };

  useEffect(() => {
    if (marks && marks.length > 0) {
      const newMarksData = marks.map((mark) => ({
        studentId: mark.studentId,
        studentName: mark.studentName as string,
        marks: mark.marks as number,
      }));

      // Only update if the data has actually changed
      const hasChanged = newMarksData.length !== marksData.length ||
        newMarksData.some((item, index) =>
          !marksData[index] ||
          item.studentId !== marksData[index].studentId ||
          item.marks !== marksData[index].marks
        );

      if (hasChanged && !editMode) {
        setMarksData(newMarksData);
        setOriginalData(newMarksData);
      }
    }
  }, [marks, editMode]); // Keep marks dependency but add proper comparison

  return (
    <div>
      <div className="flex gap-4 mb-4">
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

        <Select onValueChange={setSelectedPaperId}>
          <SelectTrigger>
            <SelectValue placeholder="Paper" />
          </SelectTrigger>
          <SelectContent>
            {papers.map((paper: any) => (
              <SelectItem key={paper.id} value={paper.id}>
                {paper.name} {paper.isMcq ? "(MCQ)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!editMode && <Button onClick={() => setEditMode(true)} disabled={editMode || marks.length === 0 || papers.find((p: any) => p.id === selectedPaperId)?.isMcq}>Edit Marks</Button>}
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
            <TableHead>Marks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(editMode ? marksData : marks).map(row => (
            <TableRow key={row.studentId}>
              <TableCell>{row.studentName as string}</TableCell>
              <TableCell>
                {editMode ? (
                  <Input type="number" value={row.marks as string} onChange={(e) => handleMarksChange(row.studentId, parseInt(e.target.value) || 0)} />
                ) : row.marks as string}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>


    </div>
  );
};

export default MarksTab;