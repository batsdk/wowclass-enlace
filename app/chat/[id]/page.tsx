'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClassChat } from '@/components/organisms/ClassChat';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import axios from 'axios';

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role: 'teacher' | 'student';
}

interface ClassData {
  id: string;
  name: string;
  description?: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user session
        const sessionRes = await axios.get('/api/auth/session');
        const userData = sessionRes.data.user;

        if (!userData) {
          router.push('/auth/signin');
          return;
        }

        setUser(userData);

        // Fetch class data
        try {
          const classRes = await axios.get(`/api/classes/${classId}`);
          setClassData(classRes.data);
        } catch {
          // If class endpoint doesn't exist, continue without class details
          setClassData({ id: classId, name: 'Class Chat' });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        router.push('/auth/signin');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [classId, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{classData?.name}</h1>
          <p className="text-muted-foreground">{classData?.description}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/chat">Back to Messages</Link>
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <ClassChat
          classId={classId}
          userId={user.id}
          userName={user.name || user.username || 'Anonymous'}
          className={classData?.name}
        />
      </div>
    </div>
  );
}
