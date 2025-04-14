'use client';

import React from 'react';
import SearchBuilder from '@/components/search/SearchBuilder';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface SearchBuilderClientProps {
  userId: string;
}

export function SearchBuilderClient({ userId }: SearchBuilderClientProps) {
  return (
    <div className="flex flex-col">
      <div className="flex justify-end mb-4">
        <LogoutButton />
      </div>
      <SearchBuilder />
    </div>
  );
}
