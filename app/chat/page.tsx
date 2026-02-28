'use client';

import { useUser } from '@/lib/useUser';
import { useQuery } from '@tanstack/react-query';
import { getClasses, getStudentClasses } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChatListPage() {
  const { data: user, isLoading: userLoading } = useUser();

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes-chat-list'],
    queryFn: async () => {
      if (user?.role === 'teacher') {
        return await getClasses();
      } else {
        return await getStudentClasses(user.id);
      }
    },
    enabled: !!user,
  });

  if (userLoading || classesLoading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      {classes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-muted p-4 rounded-full mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl mb-2">No Classes Found</CardTitle>
          <CardDescription>
            You are not associated with any classes yet. Join a class to start messaging.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls: any) => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {cls.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {cls.description || 'No description available for this class.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={`/chat/${cls.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Enter Chat
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
