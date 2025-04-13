"use client"

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  subtitle 
}) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Auth Form Section */}
      <div className="flex-grow flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="flex justify-start">
            <Link href="/" className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Link>
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <div className="mt-2 text-sm text-gray-600">
                {subtitle}
              </div>
            )}
          </div>
          
          {children}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white py-4 px-4 border-t">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} Grey Literature Search App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
