'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function MovementLogRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect old /movement-log/[id] to /transaction/[id]
    if (params.id) {
      router.replace(`/transaction/${params.id}`);
    }
  }, [params.id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting to transaction page...</p>
    </div>
  );
}
