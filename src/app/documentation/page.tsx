import React from 'react';
import { redirect } from 'next/navigation';

export default function Documentation() {
  // Redirect to the Swagger UI endpoint
  redirect('/api/swagger');
  
  // This won't be rendered, but is necessary for Next.js page component
  return null;
} 