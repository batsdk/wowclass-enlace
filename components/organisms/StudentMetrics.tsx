'use client';

import { useUser } from '@/lib/useUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudentProgress, getStudentMetrics, updateStudentMetric } from '@/lib/actions';
import { redirect, useParams } from 'next/navigation';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Props = {
  id: string;
  selectedYear: string;
  selectedTerm: string;
}

export default function StudentMetrics({ id, selectedYear, selectedTerm } : Props) {
  // const params = useParams();
  // const id = params.id as string;
  const { data: user, isLoading: userLoading } = useUser();
  const queryClient = useQueryClient();
  // const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  // const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [editMode, setEditMode] = useState(false);
  const [ratings, setRatings] = useState<{ [metric: string]: 'good' | 'avg' | 'bad' | null }>({});
  const [marks, setMarks] = useState<{ [metric: string]: number }>({});
  const [totalMarks, setTotalMarks] = useState(0);

  const { data: progress, isLoading } = useQuery({
    queryKey: ['studentProgress', id],
    queryFn: () => getStudentProgress(id),
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['studentMetrics', id, selectedYear, selectedTerm],
    queryFn: () => getStudentMetrics(id, selectedYear, selectedTerm as "1" | "2" | "3"),
    staleTime: 5 * 60 * 1000
  });

  const mutation = useMutation({
    mutationFn: updateStudentMetric,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentMetrics', id, selectedYear, selectedTerm] });
      // toast.success('Metric updated');
    },
  });


  const stableMetrics = useMemo(() => metrics, [JSON.stringify(metrics)]);

  useEffect(() => {
    if (stableMetrics) {
      const newRatings: { [metric: string]: 'good' | 'avg' | 'bad' | null } = {};
      const newMarks: { [metric: string]: number } = {};
      const metricsList = ['attendance', 'attention', 'note_complete', 'home_work', 'short_note', 'interest_subject'];

      metricsList.forEach(m => {
        const metricData = stableMetrics.find(md => md.metric === m);
        newRatings[m] = metricData ? metricData.rating : null;
        newMarks[m] = metricData ? (metricData.marks ?? 0) : 0;
      });

      setRatings(newRatings);
      setMarks(newMarks);
      setTotalMarks(Object.values(newMarks).reduce((sum, m) => sum + m, 0));
    }
  }, [stableMetrics]);

  const handleRatingChange = useCallback(
    (metric: string, rating: 'good' | 'avg' | 'bad') => {
      // Toggle behavior: if the same rating is clicked, set to null, otherwise set to new rating
      const currentRating = ratings[metric];
      const newRating = currentRating === rating ? null : rating;
      const newMark = newRating === 'good' ? 5 : newRating === 'avg' ? 3 : newRating === 'bad' ? 2 : 0;

      // Update ratings and marks for this specific metric (no mutation here)
      const updatedRatings = { ...ratings, [metric]: newRating };
      const updatedMarks = { ...marks, [metric]: newMark };

      setRatings(updatedRatings);
      setMarks(updatedMarks);
      setTotalMarks(Object.values(updatedMarks).reduce((sum, m) => sum + m, 0));
    },
    [ratings, marks]
  );

  // const handleDownloadPDF = () => {
  //   const input = document.getElementById('report-content');
  //   if (input) {
  //     html2canvas(input, {
  //       // Configure html2canvas options to handle modern CSS
  //       ignoreElements: (element) => {
  //         // Skip elements that might cause issues
  //         return false;
  //       },
  //       allowTaint: true,
  //       useCORS: true,
  //       scale: 2, // Higher quality
  //       logging: false, // Disable console warnings
  //       onclone: (clonedDoc) => {
  //         // Remove problematic styles from the cloned document
  //         const clonedElement = clonedDoc.getElementById('report-content');
  //         if (clonedElement) {
  //           // Force basic colors instead of oklch
  //           clonedElement.style.setProperty('color', '#000000', 'important');
  //           clonedElement.style.setProperty('background-color', '#ffffff', 'important');
            
  //           // Remove any problematic CSS custom properties
  //           const allElements = clonedElement.querySelectorAll('*');
  //           allElements.forEach((el) => {
  //             const htmlEl = el as HTMLElement;
  //             // Reset any problematic color values
  //             if (htmlEl.style.color && htmlEl.style.color.includes('oklch')) {
  //               htmlEl.style.color = '#000000';
  //             }
  //             if (htmlEl.style.backgroundColor && htmlEl.style.backgroundColor.includes('oklch')) {
  //               htmlEl.style.backgroundColor = '#ffffff';
  //             }
  //           });
  //         }
  //       }
  //     }).then((canvas) => {
  //       const imgData = canvas.toDataURL('image/png');
  //       const pdf = new jsPDF('p', 'mm', 'a4');
  //       const width = pdf.internal.pageSize.getWidth();
  //       const height = (canvas.height * width) / canvas.width;
  //       pdf.addImage(imgData, 'PNG', 0, 0, width, height);
  //       pdf.save(`report-${user?.firstname || 'student'}.pdf`);
  //     }).catch((error) => {
  //       console.error('Error generating PDF:', error);
  //       toast.error('Failed to generate PDF');
  //     });
  //   }
  // };

  const handleEditSaveClick = (): void => {
    if (editMode) {
      handleSave(); // Save when in edit mode
    } else {
      setEditMode(true); // Enter edit mode
    }
  };

  const handleSave = useCallback(async () => {
    try {
      // Save all the metrics that have ratings
      const promises = Object.entries(ratings).map(([metric, rating]) => {
        if (rating !== null) { // Only save metrics that have a rating
          return mutation.mutateAsync({
            studentId: id,
            year: selectedYear,
            term: selectedTerm as "1" | "2" | "3",
            metric: metric as "attendance" | "attention" | "note_complete" | "home_work" | "short_note" | "interest_subject",
            rating: rating
          });
        }
        return Promise.resolve();
      });
  
      await Promise.all(promises);
      setEditMode(false);
      toast.success('All metrics saved successfully');
    } catch (error) {
      toast.error('Failed to save metrics');
    }
  }, [ratings, id, selectedYear, selectedTerm, mutation]);

  const metricsList = [
    'attendance',
    'attention',
    'note_complete',
    'home_work',
    'short_note',
    'interest_subject',
  ];


  if (isLoading) return <div>Loading...</div>;
  if (userLoading) return <div>Loading...</div>;
  if (!user) redirect('/auth/signin');
  if (user.role === 'student' && user.id !== id) redirect('/dashboard');

  const isTeacher = user.role === 'teacher';

  return (
    <div className="p-0 max-w-4xl mx-auto">

      {/* Metrics Table */}
      <div id="report-content">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Point</TableHead>
              <TableHead>Good</TableHead>
              <TableHead>Avg</TableHead>
              <TableHead>Bad</TableHead>
              <TableHead>Marks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricsList.map(metric => (
              <TableRow key={metric}>
                <TableCell>{metric.replace('_', ' ').toUpperCase()}</TableCell>
                <TableCell>
                  <Checkbox checked={ratings[metric] === 'good'} onCheckedChange={() => handleRatingChange(metric, 'good')} disabled={!isTeacher || !editMode} />
                </TableCell>
                <TableCell>
                  <Checkbox checked={ratings[metric] === 'avg'} onCheckedChange={() => handleRatingChange(metric, 'avg')} disabled={!isTeacher || !editMode} />
                </TableCell>
                <TableCell>
                  <Checkbox checked={ratings[metric] === 'bad'} onCheckedChange={() => handleRatingChange(metric, 'bad')} disabled={!isTeacher || !editMode} />
                </TableCell>
                <TableCell>{marks[metric]}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={4} className="text-right font-bold">Total Marks</TableCell>
              <TableCell className="font-bold">{totalMarks}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Paper Table */}

      <div className="flex gap-2 mt-4">
        {isTeacher && <Button onClick={handleEditSaveClick}>{editMode ? 'Save' : 'Edit'}</Button>}
      </div>
    </div>
  );
}