'use client';

import { useUser } from '@/lib/useUser';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { startMcqAttempt, getExamQuestions, submitMcqAttempt } from '@/lib/mcqActions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from "sonner";

export default function ExamPortal() {
  const { id: examId } = useParams() as { id: string };
  const { data: user, isLoading: userLoading } = useUser();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: attempt, refetch: refetchAttempt } = useQuery({
    queryKey: ['mcqAttempt', examId],
    queryFn: () => startMcqAttempt(examId),
    enabled: isExamStarted,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['examQuestions', examId],
    queryFn: () => getExamQuestions(examId),
    enabled: isExamStarted,
  });

  const submitMutation = useMutation({
    mutationFn: (data: { attemptId: string, answers: any[] }) =>
      submitMcqAttempt(data.attemptId, data.answers),
    onSuccess: (res) => {
      setScore(res.score);
      setIsSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.success('Exam submitted successfully!');
    },
    onError: (error) => {
      console.log(error);
      toast.error('Failed to submit exam');
    }
  });

  const handleStartExam = () => {
    setIsExamStarted(true);
    // Ideally, get duration from an API call before starting
    // For now, we'll wait for the questions/attempt to load
  };

  useEffect(() => {
    if (attempt && isExamStarted && timeLeft === null) {
      // Logic for timer: endTime = startTime + duration
      // Duration is needed. If we don't have it yet, we might need an exam detail query.
      // Let's assume we fetch it or hardcode for demo. 
      // Ideally: setTimeLeft(attempt.exam.duration * 60)
      setTimeLeft(30 * 60); // Default 30 mins if not found
    }
  }, [attempt, isExamStarted]);

  useEffect(() => {
    if (isExamStarted && timeLeft !== null && timeLeft > 0 && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isExamStarted, timeLeft === 0, isSubmitted]);

  const handleAutoSubmit = useCallback(() => {
    if (!isSubmitted && attempt) {
      toast.warning('Time is up! Submitting your exam automatically...');
      handleSubmit();
    }
  }, [isSubmitted, attempt, answers]);

  const handleSubmit = () => {
    if (!attempt) return;

    const formattedAnswers = Object.entries(answers).map(([qId, optIds]) => ({
      questionId: qId,
      optionIds: optIds
    }));

    submitMutation.mutate({
      attemptId: attempt.id,
      answers: formattedAnswers
    });
  };

  const toggleAnswer = (questionId: string, optionId: string) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [questionId]: current.filter(id => id !== optionId) };
      } else {
        return { ...prev, [questionId]: [...current, optionId] };
      }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (userLoading) return <div className="p-8 text-center">Loading...</div>;

  if (!isExamStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Ready to Start?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">Once you start, the timer will begin. You cannot pause the exam.</p>
            <div className="flex justify-center gap-8 py-4">
              <div className="flex flex-col items-center"><Clock className="w-8 h-8 text-indigo-500 mb-1" /> <span className="text-sm font-medium">30 Minutes</span></div>
              <div className="flex flex-col items-center"><AlertCircle className="w-8 h-8 text-yellow-500 mb-1" /> <span className="text-sm font-medium">Auto-submit</span></div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" size="lg" onClick={handleStartExam}>
              Start Exam Now
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Exam Completed!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">Your attempt has been recorded and graded.</p>
            <div className="bg-indigo-50 rounded-xl p-8">
              <p className="text-sm text-indigo-600 font-semibold mb-1 uppercase tracking-wider">Your Final Score</p>
              <h3 className="text-5xl font-black text-indigo-900">{score}%</h3>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Sticky Header with Timer */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-800">Biology Final Exam</h2>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={(Object.keys(answers).length / questions.length) * 100} className="w-32 h-2" />
              <span className="text-xs text-gray-500">{Object.keys(answers).length}/{questions.length} Answered</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold ${(timeLeft || 0) < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-100 text-indigo-700'
            }`}>
            <Clock className="w-5 h-5" />
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 mt-6">
        {questions.map((q, idx) => (
          <Card key={q.id} className="border-none shadow-md overflow-hidden">
            <div className="bg-indigo-600 px-6 py-2">
              <span className="text-white text-xs font-bold uppercase tracking-widest">Question {idx + 1}</span>
            </div>
            <CardContent className="pt-6">
              <p className="text-lg font-semibold text-gray-900 mb-6">{q.questionText}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id]?.includes(opt.id)
                        ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    onClick={() => toggleAnswer(q.id, opt.id)}
                  >
                    <Checkbox
                      checked={answers[q.id]?.includes(opt.id)}
                      className="rounded-full w-5 h-5 border-2 text-indigo-600"
                    />
                    <span className="ml-3 font-medium text-gray-700">{opt.optionText}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-center pt-8">
          <Button
            size="lg"
            className="px-12 py-6 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-xl"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? 'Submitting...' : 'Complete & Submit Exam'}
          </Button>
        </div>
      </div>
    </div>
  );
}
