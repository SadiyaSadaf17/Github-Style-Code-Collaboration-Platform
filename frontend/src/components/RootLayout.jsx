import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CommandPalette from './CommandPalette';

function RootLayout() {
  return (
    <div>
      <Header />
      <CommandPalette />
      <div className="min-h-screen">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

export default RootLayout
