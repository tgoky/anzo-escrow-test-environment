import { Github, Twitter } from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { useLocation } from "wouter";
import logo from "../../../attached_assets/Logos/landing_page_logo.svg";

export function Footer() {
  const [_location, navigate] = useLocation();

  // Direct navigation function - will bypass any click interceptors
  const navigateTo = (path: string) => {
    // Use setTimeout to execute after current event cycle
    setTimeout(() => navigate(path), 0);
  };
  
  return (
    <footer className="relative mt-auto z-50 isolate">
      {/* Create a barrier to prevent main page background animations from appearing in footer */}
      <div className="absolute inset-0 bg-white z-10"></div>
      
      {/* Green gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8fff0] to-[#fbfefb] z-20"></div>
      
      <div className="container mx-auto px-4 py-8 relative z-30">
        <div className="grid grid-cols-12 gap-4 mb-8">
          {/* Column 1: Logo and Social Links */}
          <div className="col-span-12 md:col-span-6 lg:col-span-6 mb-8 md:mb-0">
            <img 
              src={logo} 
              alt="Anzo Labs Logo" 
              className="h-10 w-auto mb-6"
            />
            <div className="flex space-x-4">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-black transition-colors"
                aria-label="Github"
              >
                <Github size={20} />
              </a>
              <a 
                href="https://x.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-black transition-colors"
                aria-label="X (formerly Twitter)"
              >
                <Twitter size={20} />
              </a>
              <a 
                href="https://telegram.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-black transition-colors"
                aria-label="Telegram"
              >
                <FaTelegram size={20} />
              </a>
            </div>
          </div>
          
          {/* Column 2: App Links */}
          <div className="col-span-6 md:col-span-3 lg:col-span-3">
            <h3 className="font-medium text-sm mb-4 text-gray-800">App</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigateTo("/")}
                  className="text-gray-500 hover:text-black transition-colors text-sm cursor-pointer text-left bg-transparent border-none p-0"
                >
                  Exchange
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo("/marketplace")}
                  className="text-gray-500 hover:text-black transition-colors text-sm cursor-pointer text-left bg-transparent border-none p-0"
                >
                  Marketplace
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo("/liquidity")}
                  className="text-gray-500 hover:text-black transition-colors text-sm cursor-pointer text-left bg-transparent border-none p-0"
                >
                  Liquidity
                </button>
              </li>
            </ul>
          </div>
          
          {/* Column 3: Protocol Links */}
          <div className="col-span-6 md:col-span-3 lg:col-span-3">
            <h3 className="font-medium text-sm mb-4 text-gray-800">Protocol</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigateTo("/about")}
                  className="text-gray-500 hover:text-black transition-colors text-sm cursor-pointer text-left bg-transparent border-none p-0"
                >
                  About
                </button>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Copyright and Policies */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-100">
          <p className="text-gray-500 text-sm mb-4 sm:mb-0">© 2025 - Anzo Labs</p>
          <div className="flex space-x-6">
            <button
              onClick={() => navigateTo("/privacy-policy")}
              className="text-gray-500 hover:text-black transition-colors text-sm cursor-pointer bg-transparent border-none p-0"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigateTo("/terms-of-service")}
              className="text-gray-500 hover:text-black transition-colors text-sm cursor-pointer bg-transparent border-none p-0"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}