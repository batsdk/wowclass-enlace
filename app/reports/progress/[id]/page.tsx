'use client';

import {useParams } from 'next/navigation';
import StudentReport from '@/components/templates/StudentReport';
import StudentMetrics from '@/components/organisms/StudentMetrics';

export default function ProgressReport() {
  const params = useParams();
  const id = params.id as string;

  return (
    <>
      <StudentReport id={id} />
    </>
  );
}