'use client';

import { useUser } from '@/lib/useUser';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeacherExams, createMcqExam, addMcqQuestions, publishMcqExam } from '@/lib/mcqActions';
import { getTeacherInstitutes, getClassesForInstitute, getClasses } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from "sonner";
import { Plus, Settings, Play, List, Clock, Trash2, Edit } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const createExamSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  duration: z.any(),
  classId: z.string().uuid('Please select a class'),
});

const addQuestionSchema = z.object({
  questions: z.array(z.object({
    questionText: z.string().min(1, 'Question text is required'),
    options: z.array(z.object({
      optionText: z.string().min(1, 'Option text is required'),
      isCorrect: z.boolean(),
    })).length(4),
  })).min(1),
});

function MCQManagerContent() {
  const { data: user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(searchParams.get('classId'));
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(searchParams.get('paperId'));
  const [isShowAllExams, setIsShowAllExams] = useState(!searchParams.get('paperId'));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'teacher')) {
      router.push('/dashboard');
    }
  }, [user, userLoading, router]);

  const { data: institutes = [] } = useQuery({
    queryKey: ['teacherInstitutes'],
    queryFn: () => getTeacherInstitutes(),
    enabled: !!user,
  });

  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const { data: classes = [] } = useQuery({
    queryKey: ['classesForInstitute', selectedInstId],
    queryFn: () => getClassesForInstitute(selectedInstId!),
    enabled: !!selectedInstId,
  });

  const { data: allTeacherClasses = [] } = useQuery({
    queryKey: ['allTeacherClasses'],
    queryFn: () => getClasses(),
    enabled: !!user,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['mcqExams', selectedClassId, selectedPaperId, isShowAllExams],
    queryFn: () => getTeacherExams(selectedClassId || undefined, isShowAllExams ? undefined : (selectedPaperId || undefined)),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createMcqExam({ ...data, paperId: selectedPaperId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcqExams'] });
      setIsCreateOpen(false);
      toast.success('Exam created successfully');
    }
  });

  const questionMutation = useMutation({
    mutationFn: addMcqQuestions,
    onSuccess: () => {
      toast.success('Questions added');
      setIsAddQuestionOpen(false);
      questionForm.reset();
    }
  });

  const publishMutation = useMutation({
    mutationFn: publishMcqExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcqExams'] });
      toast.success('Exam published');
    }
  });

  const examForm = useForm<z.infer<typeof createExamSchema>>({
    resolver: zodResolver(createExamSchema),
    defaultValues: { title: '', duration: 30, classId: selectedClassId || '' }
  });

  const questionForm = useForm<z.infer<typeof addQuestionSchema>>({
    resolver: zodResolver(addQuestionSchema),
    defaultValues: {
      questions: [{
        questionText: '',
        options: [
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
        ]
      }]
    }
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: questionForm.control,
    name: "questions"
  });

  if (userLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedPaperId && !isShowAllExams ? 'Paper MCQs' : 'MCQ Manager'}
          </h1>
          <p className="text-gray-500 mt-1">
            {selectedPaperId && !isShowAllExams ? `Managing questions for paper` : 'Create and manage your online exams'}
          </p>
          {selectedPaperId && (
            <Button variant="link" className="p-0 h-auto text-indigo-600" onClick={() => setIsShowAllExams(!isShowAllExams)}>
              {isShowAllExams ? 'Show only this paper' : 'Show all exams'}
            </Button>
          )}
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> New Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Online MCQ Exam</DialogTitle>
            </DialogHeader>
            <Form {...examForm}>
              <form onSubmit={examForm.handleSubmit(data => createMutation.mutate(data))} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel>Institute</FormLabel>
                    <Select onValueChange={setSelectedInstId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {institutes.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                  <FormField control={examForm.control as any} name="classId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={examForm.control as any} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Unit Test 01 - Biology" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={examForm.control as any} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Minutes)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Exam'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-8">
        <Select value={selectedClassId || 'all'} onValueChange={v => setSelectedClassId(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {allTeacherClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map(exam => (
          <Card key={exam.id} className="relative group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl font-bold">{exam.title}</CardTitle>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${exam.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                  {exam.status.toUpperCase()}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-gray-500 mb-4 gap-4">
                <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {exam.duration}m</span>
                <span className="flex items-center"><List className="w-4 h-4 mr-1" /> MCQ</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                  setActiveExamId(exam.id);
                  setIsAddQuestionOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Question
                </Button>

                {exam.status === 'draft' && (
                  <Button variant="default" size="sm" className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => publishMutation.mutate(exam.id)}>
                    <Play className="w-4 h-4 mr-1" /> Publish
                  </Button>
                )}

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Questions Dialog */}
      <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent className="max-w-[100vw] w-screen h-screen m-0 p-0 rounded-none flex flex-col border-none bg-gray-50 overflow-hidden">
          <DialogHeader className="p-6 bg-white border-b flex-row justify-between items-center sticky top-0 z-10">
            <div>
              <DialogTitle className="text-2xl font-bold">Add MCQ Questions</DialogTitle>
              <p className="text-gray-500">Add multiple questions to your exam and save them all at once.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsAddQuestionOpen(false)}>Cancel</Button>
              <Button onClick={questionForm.handleSubmit(data => {
                questionMutation.mutate({
                  examId: activeExamId!,
                  questions: data.questions
                });
              })} disabled={questionMutation.isPending}>
                {questionMutation.isPending ? 'Saving...' : 'Save All Questions'}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-8 pb-12">
              <Form {...questionForm}>
                <form className="space-y-8">
                  {questionFields.map((qField, qIndex) => (
                    <Card key={qField.id} className="p-6 shadow-sm border-indigo-100 relative group">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-bold">
                            {qIndex + 1}
                          </span>
                          <h3 className="text-lg font-semibold">Question {qIndex + 1}</h3>
                        </div>
                        {questionFields.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeQuestion(qIndex)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-6">
                        <FormField control={questionForm.control as any} name={`questions.${qIndex}.questionText`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Question Text</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your question here..." {...field} className="text-lg py-6 border-indigo-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[0, 1, 2, 3].map((optIndex) => (
                            <div key={optIndex} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-100 hover:border-indigo-300 transition-colors">
                              <FormField control={questionForm.control as any} name={`questions.${qIndex}.options.${optIndex}.isCorrect`} render={({ field }) => (
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="w-6 h-6 border-indigo-300 data-[state=checked]:bg-indigo-600"
                                />
                              )} />
                              <FormField control={questionForm.control as any} name={`questions.${qIndex}.options.${optIndex}.optionText`} render={({ field }) => (
                                <Input
                                  placeholder={`Option ${optIndex + 1}`}
                                  {...field}
                                  className="border-none bg-transparent focus-visible:ring-0 text-base"
                                />
                              )} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-8 border-dashed border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 flex flex-col gap-2 rounded-xl"
                    onClick={() => appendQuestion({
                      questionText: '',
                      options: [
                        { optionText: '', isCorrect: false },
                        { optionText: '', isCorrect: false },
                        { optionText: '', isCorrect: false },
                        { optionText: '', isCorrect: false },
                      ]
                    })}
                  >
                    <Plus className="w-6 h-6" />
                    <span className="font-semibold">Add Another Question</span>
                  </Button>

                  <div className="flex justify-center pt-8">
                    <Button
                      size="lg"
                      className="px-12 py-6 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-xl"
                      onClick={questionForm.handleSubmit(data => {
                        questionMutation.mutate({
                          examId: activeExamId!,
                          questions: data.questions
                        });
                      })}
                      disabled={questionMutation.isPending}
                    >
                      {questionMutation.isPending ? 'Saving Questions...' : `Save All ${questionFields.length} Questions`}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MCQManager() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <MCQManagerContent />
    </Suspense>
  )
}
