import React from 'react';
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="max-w-7xl mx-auto px-4 py-10 mt-12 border-t border-gray-200">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left Section: Copyright and Logo */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Github size={20} className="text-gray-400 hover:text-gray-600 cursor-pointer" />
          <span>© {currentYear} GitHub Clone, Inc.</span>
        </div>

        {/* Right Section: Navigation Links */}
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[#0969da]">
          <Link to="/terms" className="hover:underline">Terms</Link>
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <Link to="/security" className="hover:underline">Security</Link>
          <Link to="/status" className="hover:underline">Status</Link>
          <Link to="/docs" className="hover:underline">Docs</Link>
          <Link to="/contact" className="hover:underline">Contact GitHub</Link>
          <Link to="/pricing" className="hover:underline text-gray-500">Pricing</Link>
          <Link to="/api" className="hover:underline text-gray-500">API</Link>
          <Link to="/training" className="hover:underline text-gray-500">Training</Link>
          <Link to="/blog" className="hover:underline text-gray-500">Blog</Link>
          <Link to="/about" className="hover:underline text-gray-500">About</Link>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;