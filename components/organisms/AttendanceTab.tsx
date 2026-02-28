'use client';

import { useUser } from '@/lib/useUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttendance, markAttendance, getTeacherInstitutes, getClassesForInstitute, getAttendanceRecords, updateAttendanceRecords } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { toast } from "sonner";
import { useState, useEffect } from 'react';

const AttendanceTab = () => {
  const queryClient = useQueryClient();
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [attendanceData, setAttendanceData] = useState<{ studentId: string; studentName: string; attended: boolean }[]>([]);
  const [originalData, setOriginalData] = useState<{ studentId: string; studentName: string; attended: boolean }[]>([]);
  // const [editMode, setEditMode] = useState(false);
  const [editAttendanceData, setEditAttendanceData] = useState<{ attendanceId: string; studentId: string; studentName: string; attended: boolean }[]>([]);
  // const [originalEditData, setOriginalEditData] = useState<typeof editAttendanceData>([]);

  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
  });

  const { data: filteredClasses = [] } = useQuery({
    queryKey: ['classesForInstitute', selectedInstituteId],
    queryFn: () => getClassesForInstitute(selectedInstituteId!),
    enabled: !!selectedInstituteId,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedClassId, selectedDate],
    queryFn: () => selectedClassId && selectedDate ? getAttendance({ classId: selectedClassId, date: selectedDate }) : Promise.resolve([]),
    enabled: !!selectedClassId && !!selectedDate,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendanceRecords', selectedClassId, selectedDate],
    queryFn: () => selectedClassId && selectedDate ? getAttendanceRecords({ classId: selectedClassId, date: selectedDate }) : Promise.resolve([]),
    enabled: !!selectedClassId && !!selectedDate,
  });

  // Add this effect to update state when attendance changes
  // useEffect(() => {
  //   const normalized = attendance.map((row: { studentId: string; studentName: unknown; attended: boolean | null }) => ({
  //     ...row,
  //     studentName: String(row.studentName),
  //     attended: row.attended ?? false,
  //   }));

  //   // Only update if data actually changed
  //   const isSame =
  //     attendanceData.length === normalized.length &&
  //     attendanceData.every((row, i) =>
  //       row.studentId === normalized[i].studentId &&
  //       row.studentName === normalized[i].studentName &&
  //       row.attended === normalized[i].attended
  //     );

  //   if (!isSame) {
  //     setAttendanceData(normalized);
  //     setOriginalData(normalized);
  //   }
  //   // eslint-disable-next-line
  // }, [attendance]);

  useEffect(() => {
    const normalized = attendance.map((row: { studentId: string; studentName: unknown; attended: unknown }) => ({
      ...row,
      studentName: String(row.studentName),
      attended: typeof row.attended === 'boolean' ? row.attended : false, // Explicitly handle unknown to boolean
    }));
  
    // Only update if data actually changed
    const isSame =
      attendanceData.length === normalized.length &&
      attendanceData.every((row, i) =>
        row.studentId === normalized[i].studentId &&
        row.studentName === normalized[i].studentName &&
        row.attended === normalized[i].attended
      );
  
    if (!isSame) {
      setAttendanceData(normalized);
      setOriginalData(normalized);
    }
    // eslint-disable-next-line
  }, [attendance]);


  useEffect(() => {
    const normalized = attendanceRecords.map((row: { attendanceId: string | null; studentId: string; studentName: unknown; attended: boolean | null }) => ({
      ...row,
      attendanceId: String(row.attendanceId ?? ''),
      studentName: String(row.studentName),
      attended: row.attended ?? false,
    }));
    const isSame =
      editAttendanceData.length === normalized.length &&
      editAttendanceData.every((row, i) =>
        row.attendanceId === normalized[i].attendanceId &&
        row.studentId === normalized[i].studentId &&
        row.studentName === normalized[i].studentName &&
        row.attended === normalized[i].attended
      );
    if (!isSame) {
      setEditAttendanceData(normalized);
      // setOriginalEditData(normalized);
    }
    // eslint-disable-next-line
  }, [attendanceRecords]);

  const mutation = useMutation({
    mutationFn: markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance marked');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleAttendanceChange = (studentId: string, attended: boolean) => {
    setAttendanceData(prev => prev.map(row => row.studentId === studentId ? { ...row, attended } : row));
  };

  const onSave = () => {
    if (!selectedDate) return;
    const changes = attendanceData.map(row => ({
      studentId: row.studentId,
      classId: selectedClassId!,
      date: selectedDate,
      attended: row.attended,
    }));
    mutation.mutate(changes);
  };

  const onCancel = () => {
    setAttendanceData(originalData);
  };

  // const updateRecordsMutation = useMutation({
  //   mutationFn: updateAttendanceRecords,
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
  //     toast.success('Attendance records updated');
  //     setEditMode(false);
  //   },
  //   onError: (error: any) => toast.error(error.message),
  // });

  // const handleEditAttendanceChange = (attendanceId: string, attended: boolean) => {
  //   setEditAttendanceData(prev => prev.map(row => row.attendanceId === attendanceId ? { ...row, attended } : row));
  // };

  // const onEditSave = () => {
  //   // Only update changed records
  //   const changes = editAttendanceData.filter((row, i) => row.attended !== originalEditData[i]?.attended)
  //     .map(row => ({ attendanceId: row.attendanceId, attended: row.attended }));
  //   if (changes.length > 0) updateRecordsMutation.mutate(changes);
  // };

  // const onEditCancel = () => {
  //   setEditAttendanceData(originalEditData);
  //   setEditMode(false);
  // };

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
        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} required={false} />
      </div>

      <div className="flex gap-2 mt-4 justify-end">
        <Button onClick={onSave}>Save</Button>
        <Button variant="destructive" onClick={onCancel}>Cancel</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Attended</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendanceData.map(row => (
            <TableRow key={row.studentId}>
              <TableCell>{row.studentName}</TableCell>
              <TableCell>
                <Checkbox checked={row.attended} onCheckedChange={(checked) => handleAttendanceChange(row.studentId, !!checked)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>


    </div>
  );
};

export default AttendanceTab;