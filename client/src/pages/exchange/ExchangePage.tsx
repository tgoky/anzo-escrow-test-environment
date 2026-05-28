import { useState, useEffect, useRef } from "react";
import BuyForm from "@/components/exchange/BuyForm";
import BackgroundAnimation from "@/components/exchange/BackgroundAnimation";
import { motion } from "framer-motion";
import { 
  ChevronDown, 
  Shield, 
  Zap, 
  FileCheck, 
  Link as LinkIcon, 
  Globe,
  Users,
  Lock,
  RefreshCw
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useFinancialAccountStore } from "@/lib/financialAccountStore";
import type { FinancialAccount } from '@shared/types/financial-account';
import { useTranslation } from "react-i18next";

export default function ExchangePage() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<'form' | 'searching' | 'progress' | 'verification'>('form');
  const featuresRef = useRef<HTMLDivElement>(null);

  const { 
    connectedAccounts,
    selectedAccountIndex,
    setSelectedAccountIndex,
    addAccount,
    removeAccount
  } = useFinancialAccountStore();

  const [makerSettings, setMakerSettings] = useState<{
    isMaker: boolean;
    pricing: {
      [key: string]: {
        markup: number;
        active: boolean;
      }
    };
    paymentInstructions: string;
  }>(() => {
    const saved = localStorage.getItem('makerSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      isMaker: false,
      pricing: {
        USDC: { markup: 2, active: true }
      },
      paymentInstructions: ""
    };
  });

  const { data: makers } = useQuery({
    queryKey: ['makers'],
    queryFn: async () => {
      const response = await axios.get('/api/makers');
      return response.data;
    }
  });

  useEffect(() => {
    localStorage.setItem('makerSettings', JSON.stringify(makerSettings));
  }, [makerSettings]);

  const handleAccountConnect = (account: FinancialAccount) => {
    addAccount(account);
  };

  const handleAccountSelect = (index: number) => {
    setSelectedAccountIndex(index);
  };

  const handleAccountDisconnect = (index: number) => {
    removeAccount(index);
  };

  const handleMakerSettingsChange = (settings: typeof makerSettings) => {
    setMakerSettings(settings);
  };

  const scrollToBottom = () => {
    if (featuresRef.current) {
      featuresRef.current.scrollIntoView({ 
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-transparent flex flex-col items-center justify-between p-4 overflow-hidden">
      <BackgroundAnimation />
      <div className={`flex flex-col items-center w-full max-w-5xl relative z-10 ${
        currentStep === 'form' ? 'pt-16' : 'min-h-[100dvh] justify-center'
      }`}>
        {currentStep === 'form' && (
          <>
            <h1 className="text-6xl text-center font-['Poppins'] text-gray-800 dark:text-white mb-6 leading-tight">
              {t('landingPage.mainSlogan')}
            </h1>

            <motion.p 
              className="text-lg text-center text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8,
                delay: 0.5,
                ease: [0.04, 0.62, 0.23, 0.98]
              }}
            >
              {t('landingPage.description')}{' '}
              <img 
                src="https://cryptologos.cc/logos/versions/solana-sol-logo-horizontal.svg?v=040" 
                alt="Solana" 
                className="inline-block h-8 ml-1 dark:brightness-200"
                style={{ 
                  filter: 'brightness(1) contrast(1) grayscale(1)',
                  background: 'none',
                  mixBlendMode: 'multiply'
                }}
              />
            </motion.p>
          </>
        )}

        <div className={`w-full max-w-md ${currentStep !== 'form' ? '-mt-16' : ''}`}>
          <BuyForm 
            onAccountConnect={handleAccountConnect}
            connectedAccounts={connectedAccounts.map(account => ({
              account: account.account,
              id: account.id
              // walletAddress is no longer needed as it's not in the ConnectedFinancialAccount interface
            }))}
            selectedAccountIndex={selectedAccountIndex}
            onAccountSelect={handleAccountSelect}
            onAccountDisconnect={handleAccountDisconnect}
            onStepChange={setCurrentStep}
            makerSettings={makerSettings}
            onMakerSettingsChange={handleMakerSettingsChange}
          />
        </div>

        {currentStep === 'form' && (
          <motion.div 
            className="flex flex-col items-center justify-center w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.8,
              delay: 0.5,
              ease: [0.04, 0.62, 0.23, 0.98]
            }}
          >
            <motion.button
              onClick={scrollToBottom}
              className="flex flex-col items-center text-gray-500 hover:text-gray-700 transition-colors mt-2"
              animate={{
                y: [0, 10, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <span className="text-sm mb-1">{t('landingPage.scrollDown')}</span>
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </div>
      
      {/* Marketing Features Section - Uniswap-inspired with ultra-clean design */}
      <div ref={featuresRef} className="w-full mx-auto relative z-10 overflow-x-hidden bg-white">
        {/* Pure white background with enhanced gradient and decorations */}
        <div className="relative">
          {/* Subtle background gradients */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#BCE704]/[0.02] via-transparent to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#BCE704]/[0.02] via-transparent to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-[25%] left-[15%] w-[400px] h-[400px] bg-gradient-to-tl from-[#BCE704]/[0.01] via-transparent to-transparent rounded-full blur-3xl"></div>
          
          {/* Top central decorative pattern */}
          <div className="absolute top-0 left-0 w-full h-48 overflow-hidden pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
              className="relative w-full h-full"
            >
              {/* Enhanced diagonal speed lines - edge to edge with steeper angles */}
              <motion.svg 
                className="absolute w-full h-full top-0 left-0"
                viewBox="0 0 100 50" 
                preserveAspectRatio="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.2 }}
              >
                <defs>
                  <linearGradient id="speedGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#BCE704" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#BCE704" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#BCE704" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="speedGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#BCE704" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#BCE704" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#BCE704" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="speedGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#BCE704" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#BCE704" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#BCE704" stopOpacity="0.2" />
                  </linearGradient>
                  
                  {/* Enhanced glow filter for particles */}
                  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                
                {/* Top diagonal line - steep upward angle */}
                <motion.path
                  d="M0,25 C15,15 35,12 60,5 S80,3 100,10"
                  stroke="url(#speedGradient1)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                />
                
                {/* Middle diagonal line */}
                <motion.path
                  d="M0,30 C20,25 40,20 65,15 S85,15 100,20"
                  stroke="url(#speedGradient2)"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 2, delay: 0.1, ease: "easeOut" }}
                />
                
                {/* Bottom diagonal line */}
                <motion.path
                  d="M0,35 C25,35 45,30 70,25 S90,25 100,30"
                  stroke="url(#speedGradient3)"
                  strokeWidth="0.65"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 2.2, delay: 0.2, ease: "easeOut" }}
                />
                
                {/* Animated particles along the top diagonal */}
                {[...Array(10)].map((_, i) => (
                  <motion.circle
                    key={`top-particle-${i}`}
                    r="0.4"
                    fill="#BCE704"
                    filter="url(#glow)"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0, 0.85, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: "easeInOut"
                    }}
                    style={{
                      offsetPath: "path('M0,25 C15,15 35,12 60,5 S80,3 100,10')",
                      offsetDistance: `${i * 10}%`,
                    }}
                  />
                ))}
                
                {/* Animated particles along the middle diagonal */}
                {[...Array(10)].map((_, i) => (
                  <motion.circle
                    key={`middle-particle-${i}`}
                    r="0.35"
                    fill="#BCE704"
                    filter="url(#glow)"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0, 0.75, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.4 + 0.2,
                      ease: "easeInOut"
                    }}
                    style={{
                      offsetPath: "path('M0,30 C20,25 40,20 65,15 S85,15 100,20')",
                      offsetDistance: `${i * 10}%`,
                    }}
                  />
                ))}
                
                {/* Animated particles along the bottom diagonal */}
                {[...Array(10)].map((_, i) => (
                  <motion.circle
                    key={`bottom-particle-${i}`}
                    r="0.3"
                    fill="#BCE704"
                    filter="url(#glow)"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0, 0.65, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.4 + 0.4,
                      ease: "easeInOut"
                    }}
                    style={{
                      offsetPath: "path('M0,35 C25,35 45,30 70,25 S90,25 100,30')",
                      offsetDistance: `${i * 10}%`,
                    }}
                  />
                ))}
                
                {/* Moving highlight sections along top diagonal */}
                <motion.path
                  d="M0,25 C15,15 35,12 60,5 S80,3 100,10"
                  stroke="#BCE704"
                  strokeWidth="0.5"
                  strokeDasharray="5 20"
                  fill="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9, strokeDashoffset: [-30, 0] }}
                  transition={{ 
                    duration: 2.2, 
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "linear" 
                  }}
                />
                
                {/* Moving highlight sections along middle diagonal */}
                <motion.path
                  d="M0,30 C20,25 40,20 65,15 S85,15 100,20"
                  stroke="#BCE704"
                  strokeWidth="0.45"
                  strokeDasharray="4 22"
                  fill="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7, strokeDashoffset: [-30, 0] }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "linear",
                    delay: 0.2
                  }}
                />
                
                {/* Moving highlight sections along bottom diagonal */}
                <motion.path
                  d="M0,35 C25,35 45,30 70,25 S90,25 100,30"
                  stroke="#BCE704"
                  strokeWidth="0.4"
                  strokeDasharray="3 25"
                  fill="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5, strokeDashoffset: [-30, 0] }}
                  transition={{ 
                    duration: 2.8, 
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "linear",
                    delay: 0.4
                  }}
                />
                
                {/* Additional larger speed burst particles */}
                {[0, 30, 60, 90].map((position, i) => (
                  <motion.circle
                    key={`speed-burst-${i}`}
                    r="0.7"
                    fill="#BCE704"
                    filter="url(#glow)"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0, 0.9, 0],
                      scale: [1, 1.5, 0.8]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.7 + 1,
                      repeatDelay: 3,
                      ease: "easeInOut"
                    }}
                    style={{
                      offsetPath: "path('M0,25 C15,15 35,12 60,5 S80,3 100,10')",
                      offsetDistance: `${position}%`,
                    }}
                  />
                ))}
              </motion.svg>
              
              {/* Scattered geometric elements across the top */}
              <div className="absolute inset-0">
                {/* Top left cluster */}
                <motion.div
                  className="absolute left-[5%] top-[15%]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <motion.div 
                    className="w-5 h-5 rounded-sm bg-white border border-[#f0f0f0] shadow-sm"
                    animate={{ rotate: [0, 15, 0], y: [0, -5, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="w-full h-1 bg-[#BCE704]/10 rounded-t-sm"></div>
                  </motion.div>
                  <motion.div 
                    className="absolute -top-3 left-6 w-3 h-3 rounded-full bg-[#BCE704]/10"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  />
                </motion.div>
                
                {/* Top center elements */}
                <motion.div
                  className="absolute left-[50%] transform -translate-x-1/2 top-[10%]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  <motion.div 
                    className="relative w-10 h-10 rounded-full bg-white border border-[#f0f0f0] shadow-sm overflow-hidden"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                  >
                    <div className="absolute bottom-0 w-full h-1/2 bg-[#BCE704]/5"></div>
                    <motion.div 
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#BCE704]/20"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                  <motion.div 
                    className="absolute -bottom-4 -right-4 w-6 h-6 rounded-md bg-white border border-[#f5f5f5] shadow-sm"
                    animate={{ rotate: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  >
                    <div className="w-full h-1/3 bg-[#BCE704]/10 rounded-t-md"></div>
                  </motion.div>
                </motion.div>
                
                {/* Top right elements */}
                <motion.div
                  className="absolute right-[10%] top-[20%]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                >
                  <motion.div 
                    className="relative w-8 h-12 rounded-xl bg-white border border-[#f0f0f0] shadow-sm"
                    animate={{ rotate: [0, 5, 0], y: [0, -5, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  >
                    <div className="absolute top-0 w-full h-1/3 bg-[#BCE704]/5 rounded-t-xl"></div>
                  </motion.div>
                  <motion.div 
                    className="absolute -top-3 -left-2 w-4 h-4 rounded-full bg-[#BCE704]/15"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
          
          {/* Left side decorative elements */}
          <div className="absolute left-0 top-[15%] w-64 h-[600px] overflow-hidden pointer-events-none hidden lg:block">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative h-full"
            >
              {/* Large floating pentagon */}
              <motion.div 
                className="absolute top-24 left-5 w-24 h-24"
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 5, 0]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                  <motion.path 
                    d="M50,5 L90,30 L80,80 L20,80 L10,30 Z" 
                    fill="white" 
                    stroke="#f0f0f0" 
                    strokeWidth="1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  />
                  <motion.path 
                    d="M50,15 L80,35 L70,75 L30,75 L20,35 Z" 
                    fill="#BCE704" 
                    fillOpacity="0.03" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.3 }}
                  />
                </svg>
              </motion.div>
              
              {/* Floating square with rotating inner circle */}
              <motion.div 
                className="absolute top-[40%] -left-2 w-20 h-20 rounded-2xl bg-white border border-[#f5f5f5] shadow-sm overflow-hidden flex items-center justify-center"
                animate={{ 
                  y: [0, 15, 0],
                  x: [0, 8, 0],
                  rotate: [0, -3, 0]
                }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              >
                <div className="absolute w-full h-full bg-gradient-to-br from-[#f9f9f9] to-white"></div>
                <motion.div 
                  className="w-12 h-12 rounded-full"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <svg viewBox="0 0 50 50" className="w-full h-full">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#BCE704" strokeWidth="1" strokeDasharray="2 4" />
                    <circle cx="25" cy="25" r="10" fill="#BCE704" fillOpacity="0.1" />
                    <circle cx="25" cy="25" r="5" fill="#BCE704" fillOpacity="0.15" />
                  </svg>
                </motion.div>
              </motion.div>
              
              {/* Small accent shapes */}
              <motion.div 
                className="absolute bottom-40 left-14 w-10 h-10 rounded-full bg-[#BCE704] opacity-[0.07]"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.07, 0.12, 0.07]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div 
                className="absolute bottom-36 left-32 w-6 h-6 rounded-md bg-white border border-[#f5f5f5] shadow-sm rotate-12"
                animate={{ 
                  rotate: [12, 0, 12],
                  y: [0, -8, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              >
                <div className="w-full h-1/2 bg-[#BCE704]/[0.04] rounded-t-md"></div>
              </motion.div>
            </motion.div>
          </div>
          
          {/* Right side decorative elements */}
          <div className="absolute right-0 top-[20%] w-64 h-[600px] overflow-hidden pointer-events-none hidden lg:block">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative h-full"
            >
              {/* Large floating hexagon */}
              <motion.div 
                className="absolute top-[10%] -right-5 w-28 h-28"
                animate={{ 
                  y: [0, -15, 0],
                  x: [0, -5, 0],
                  rotate: [0, 8, 0]
                }}
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                  <motion.path 
                    d="M50,5 L90,25 L90,75 L50,95 L10,75 L10,25 Z" 
                    fill="white" 
                    stroke="#f0f0f0" 
                    strokeWidth="1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  />
                  <motion.path 
                    d="M50,20 L80,35 L80,70 L50,85 L20,70 L20,35 Z" 
                    fill="#BCE704" 
                    fillOpacity="0.04" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.3 }}
                  />
                </svg>
              </motion.div>
              
              {/* Floating circle with pulse effect */}
              <motion.div 
                className="absolute top-[45%] right-10 w-20 h-20 rounded-full bg-white border border-[#f5f5f5] shadow-sm overflow-hidden"
                animate={{ 
                  y: [0, 20, 0],
                  x: [0, -8, 0]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.7
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-bl from-[#f9f9f9] to-white"></div>
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#BCE704" strokeWidth="1" strokeOpacity="0.2" />
                    <motion.circle 
                      cx="50" 
                      cy="50" 
                      r="30" 
                      fill="none" 
                      stroke="#BCE704" 
                      strokeWidth="1" 
                      strokeOpacity="0.4"
                      animate={{ r: [30, 35, 30] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <circle cx="50" cy="50" r="10" fill="#BCE704" fillOpacity="0.15" />
                  </svg>
                </motion.div>
              </motion.div>
              
              {/* Triangle with shine effect */}
              <motion.div 
                className="absolute bottom-[25%] -right-5 w-24 h-24"
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, -5, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <motion.path 
                    d="M50,10 L90,80 L10,80 Z" 
                    fill="white" 
                    stroke="#f5f5f5" 
                    strokeWidth="1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  />
                  <motion.path 
                    d="M50,30 L75,70 L25,70 Z" 
                    fill="#BCE704" 
                    fillOpacity="0.05" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.3 }}
                  />
                </svg>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-60"
                  animate={{ left: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                />
              </motion.div>
              
              {/* Small accent elements */}
              <motion.div 
                className="absolute top-[20%] right-32 w-8 h-8 rounded-full bg-[#BCE704]"
                style={{ opacity: 0.06 }}
                animate={{ 
                  y: [0, -7, 0],
                  scale: [1, 1.15, 1],
                  opacity: [0.06, 0.1, 0.06]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.5
                }}
              />
              <motion.div 
                className="absolute bottom-[40%] right-24 w-6 h-6 rounded-sm bg-white border border-[#f5f5f5] shadow-sm rotate-45"
                animate={{ 
                  rotate: [45, 90, 45],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              />
            </motion.div>
          </div>
          
          {/* Center background decoration */}
          <div className="absolute left-1/2 top-1/2 w-full h-full transform -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none overflow-hidden hidden lg:block">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2 }}
              className="relative w-full h-full"
            >
              <svg width="100%" height="100%" viewBox="0 0 1000 1000" className="absolute inset-0">
                <defs>
                  <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eaeaea" strokeWidth="0.5" opacity="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#smallGrid)" />
              </svg>
            </motion.div>
          </div>
          
          <div className="pt-40 pb-40 px-6 relative">
            <div className="max-w-7xl mx-auto">
              {/* Ultra-clean section header with enhanced animations */}
              <motion.div 
                className="mb-32 text-center relative"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <motion.div 
                  className="absolute -top-16 left-1/2 transform -translate-x-1/2"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.1 }}
                >
                  <svg width="120" height="48" viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-10">
                    <path d="M20 48C31.0457 48 40 39.0457 40 28C40 16.9543 31.0457 8 20 8C8.9543 8 0 16.9543 0 28C0 39.0457 8.9543 48 20 48Z" fill="#BCE704" fillOpacity="0.2"/>
                    <path d="M60 40C71.0457 40 80 31.0457 80 20C80 8.9543 71.0457 0 60 0C48.9543 0 40 8.9543 40 20C40 31.0457 48.9543 40 60 40Z" fill="#BCE704" fillOpacity="0.2"/>
                    <path d="M100 48C111.046 48 120 39.0457 120 28C120 16.9543 111.046 8 100 8C88.9543 8 80 16.9543 80 28C80 39.0457 88.9543 48 100 48Z" fill="#BCE704" fillOpacity="0.2"/>
                  </svg>
                </motion.div>
                
                <motion.div
                  className="inline-flex items-center px-4 py-1.5 bg-[#fafafa] rounded-full mb-6 shadow-sm border border-[#f0f0f8]"
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <div className="w-2 h-2 rounded-full bg-[#BCE704] mr-2"></div>
                  <span className="text-xs font-['Poppins'] font-medium text-gray-600 tracking-wider">PLATFORM HIGHLIGHTS</span>
                </motion.div>
                
                <motion.h2 
                  className="text-[56px] leading-[1.1] font-['Poppins'] font-black text-[#111111] tracking-tight mb-7"
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <span className="inline-block relative">
                    Trading <span className="relative inline-block">
                      made
                      <motion.svg 
                        width="100%" 
                        height="8" 
                        viewBox="0 0 100 8" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute -bottom-1 left-0 w-full"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                        viewport={{ once: true }}
                      >
                        <path d="M1 5.5C20 0 80 0 99 5.5" stroke="#BCE704" strokeWidth="3" strokeLinecap="round"/>
                      </motion.svg>
                    </span> simple.
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent">Non-custodial on Solana.</span>
                </motion.h2>
                
                <motion.p
                  className="text-gray-500 max-w-xl mx-auto text-lg font-light leading-relaxed"
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  Trade peer-to-peer with smart contract escrow, custom payment methods,
                  and AI-powered risk management in a truly frictionless experience.
                </motion.p>
              </motion.div>
              
              {/* Feature Cards - 2×2 Grid Layout with enhanced styling */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                {/* Feature Card 1 - Non-custodial */}
                <motion.div 
                  className="group rounded-3xl overflow-hidden"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ 
                    boxShadow: "0 20px 80px rgba(188, 231, 4, 0.07)",
                    y: -6,
                    transition: { duration: 0.4 }
                  }}
                >
                  <div className="bg-white p-10 rounded-3xl h-full border border-[#f5f5f5] relative overflow-hidden transition-all duration-500">
                    {/* Feature icon with animation */}
                    <div className="relative z-10">
                      <div className="rounded-2xl bg-[#fafafa] p-5 w-16 h-16 mb-7 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:bg-[#BCE704]/10 transition-all duration-300">
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: 10 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <Shield className="h-7 w-7 text-[#BCE704]" />
                        </motion.div>
                      </div>
                      
                      <h3 className="text-2xl font-['Poppins'] font-bold text-black mb-4 tracking-tight">Non-custodial escrow</h3>
                      <p className="text-gray-600 font-light leading-relaxed mb-8">
                        Trade directly through our smart contract on Solana without ever losing custody of your assets. Your keys, your crypto – always.
                      </p>
                    </div>
                    
                    {/* Enhanced illustration - Non-custodial escrow */}
                    <div className="relative h-56 rounded-2xl overflow-hidden bg-[#fafafa] z-0 border border-[#f5f5f5]">
                      {/* Background patterns inspired by the example */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" fill="none">
                        {/* Subtle grid pattern */}
                        <pattern id="escrow-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
                        </pattern>
                        <rect width="400" height="220" fill="url(#escrow-grid)" fillOpacity="0.6" />
                        
                        {/* Circular background */}
                        <motion.circle 
                          cx="190" 
                          cy="110" 
                          r="90" 
                          fill="white" 
                          stroke="#f0f0f0" 
                          strokeWidth="1"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 1 }}
                        />
                        
                        {/* Dotted circle pattern */}
                        <motion.circle 
                          cx="190" 
                          cy="110" 
                          r="85" 
                          stroke="#eaeaea" 
                          strokeWidth="2" 
                          strokeDasharray="3 5" 
                          fill="none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1, delay: 0.3 }}
                        />
                      </svg>
                      
                      {/* Shield container with animation */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="relative"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.8 }}
                        >
                          {/* Animated elements flowing around shield */}
                          <div className="absolute inset-0 w-full h-full">
                            {/* Key icon orbiting */}
                            <motion.div 
                              className="absolute"
                              style={{ x: -40, y: -40 }}
                              animate={{
                                x: [-40, -30, -40, -50, -40],
                                y: [-40, -50, -60, -50, -40],
                                rotate: [0, 10, 0, -10, 0]
                              }}
                              transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            >
                              <div className="bg-white p-2 rounded-full shadow-sm border border-[#f0f0f0]">
                                <Lock className="h-5 w-5 text-[#BCE704]" />
                              </div>
                            </motion.div>
                            
                            {/* Solana logo orbiting */}
                            <motion.div 
                              className="absolute"
                              style={{ x: 50, y: -30 }}
                              animate={{
                                x: [50, 60, 50, 40, 50],
                                y: [-30, -40, -30, -20, -30],
                                rotate: [0, -10, 0, 10, 0]
                              }}
                              transition={{
                                duration: 10,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.5
                              }}
                            >
                              <div className="bg-white p-2 rounded-full shadow-sm border border-[#f0f0f0] flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 128 128" className="text-[#BCE704]">
                                  <path d="M93.96 42.02H34.77c-2.64 0-4.75 2.19-4.75 4.75 0 1.82.99 3.48 2.67 4.31l59.19 29.09c5.3 2.59 11.29-1.8 10.88-7.92l-2.07-29.09c-.33-4.46-4.08-7.84-8.55-7.84" fill="currentColor" opacity="0.6"/>
                                  <path d="M38.69 50.38l49.56 24.36c1.58.78 1.85 2.95.48 4.05l-16.28 13.11c-.84.68-1.98.91-3.11.62L29.92 81.91c-2.51-.75-2.98-4.11-.79-5.71l4.34-3.16a4.698 4.698 0 0 1 5.21-.2" fill="currentColor" opacity="0.6"/>
                                </svg>
                              </div>
                            </motion.div>
                            
                            {/* Wallet icon orbiting */}
                            <motion.div 
                              className="absolute"
                              style={{ x: 40, y: 40 }}
                              animate={{
                                x: [40, 50, 40, 30, 40],
                                y: [40, 30, 40, 50, 40],
                                rotate: [0, 10, 0, -10, 0]
                              }}
                              transition={{
                                duration: 9,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 1
                              }}
                            >
                              <div className="bg-white p-2 rounded-full shadow-sm border border-[#f0f0f0]">
                                <svg className="h-5 w-5 text-[#BCE704]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="2" y="5" width="20" height="14" rx="2" />
                                  <line x1="2" y1="10" x2="22" y2="10" />
                                </svg>
                              </div>
                            </motion.div>
                            
                            {/* Contract icon orbiting */}
                            <motion.div 
                              className="absolute"
                              style={{ x: -50, y: 30 }}
                              animate={{
                                x: [-50, -60, -50, -40, -50],
                                y: [30, 40, 30, 20, 30],
                                rotate: [0, -10, 0, 10, 0]
                              }}
                              transition={{
                                duration: 7,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 1.5
                              }}
                            >
                              <div className="bg-white p-2 rounded-full shadow-sm border border-[#f0f0f0]">
                                <FileCheck className="h-5 w-5 text-[#BCE704]" />
                              </div>
                            </motion.div>
                          </div>
                          
                          {/* Connection lines */}
                          <svg className="absolute inset-0 h-full w-full" viewBox="-100 -100 200 200">
                            <motion.path 
                              d="M 0,0 L -50,-40" 
                              stroke="#BCE704" 
                              strokeWidth="1.5" 
                              strokeDasharray="5,3"
                              strokeOpacity="0.5"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1, delay: 0.5 }}
                            />
                            <motion.path 
                              d="M 0,0 L 50,-30" 
                              stroke="#BCE704" 
                              strokeWidth="1.5" 
                              strokeDasharray="5,3"
                              strokeOpacity="0.5"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1, delay: 0.7 }}
                            />
                            <motion.path 
                              d="M 0,0 L 40,40" 
                              stroke="#BCE704" 
                              strokeWidth="1.5" 
                              strokeDasharray="5,3"
                              strokeOpacity="0.5"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1, delay: 0.9 }}
                            />
                            <motion.path 
                              d="M 0,0 L -50,30" 
                              stroke="#BCE704" 
                              strokeWidth="1.5" 
                              strokeDasharray="5,3"
                              strokeOpacity="0.5"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1, delay: 1.1 }}
                            />
                            
                            {/* Animated pulses along the paths */}
                            <motion.circle 
                              r="2" 
                              fill="#BCE704" 
                              initial={{ opacity: 0 }}
                              animate={{ 
                                opacity: [0, 1, 0],
                                offsetDistance: ["0%", "100%"]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: 2,
                                ease: "easeInOut"
                              }}
                              style={{ offsetPath: "path('M 0,0 L -50,-40')" }}
                            />
                            <motion.circle 
                              r="2" 
                              fill="#BCE704" 
                              initial={{ opacity: 0 }}
                              animate={{ 
                                opacity: [0, 1, 0],
                                offsetDistance: ["0%", "100%"]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: 2.5,
                                ease: "easeInOut"
                              }}
                              style={{ offsetPath: "path('M 0,0 L 50,-30')" }}
                            />
                            <motion.circle 
                              r="2" 
                              fill="#BCE704" 
                              initial={{ opacity: 0 }}
                              animate={{ 
                                opacity: [0, 1, 0],
                                offsetDistance: ["0%", "100%"]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: 3,
                                ease: "easeInOut"
                              }}
                              style={{ offsetPath: "path('M 0,0 L 40,40')" }}
                            />
                            <motion.circle 
                              r="2" 
                              fill="#BCE704" 
                              initial={{ opacity: 0 }}
                              animate={{ 
                                opacity: [0, 1, 0],
                                offsetDistance: ["0%", "100%"]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: 3.5,
                                ease: "easeInOut"
                              }}
                              style={{ offsetPath: "path('M 0,0 L -50,30')" }}
                            />
                          </svg>
                          
                          {/* Center shield with pulse effect */}
                          <motion.div
                            className="relative rounded-full bg-white shadow-lg border border-[#f5f5f5] p-5 z-20"
                            animate={{ 
                              boxShadow: [
                                "0 0 0 0 rgba(188, 231, 4, 0)",
                                "0 0 0 10px rgba(188, 231, 4, 0.1)",
                                "0 0 0 0 rgba(188, 231, 4, 0)"
                              ]
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <Shield className="h-9 w-9 text-[#BCE704]" />
                          </motion.div>
                        </motion.div>
                      </div>
                      
                      {/* Badge label - Positioned similar to the example */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <motion.div
                          className="bg-white px-5 py-2 rounded-full shadow-sm flex items-center space-x-2 border border-[#f0f0f8]"
                          initial={{ y: 20, opacity: 0 }}
                          whileInView={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.7 }}
                          viewport={{ once: true }}
                          whileHover={{ 
                            y: -2, 
                            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)",
                            transition: { duration: 0.2 }
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-[#BCE704]"></div>
                          <span className="font-medium text-sm text-gray-700 tracking-wide">Self-custody</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Feature Card 2 - AI Risk Management */}
                <motion.div 
                  className="group rounded-3xl overflow-hidden"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.2 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ 
                    boxShadow: "0 20px 80px rgba(188, 231, 4, 0.07)",
                    y: -6,
                    transition: { duration: 0.4 }
                  }}
                >
                  <div className="bg-white p-10 rounded-3xl h-full border border-[#f5f5f5] relative overflow-hidden transition-all duration-500">
                    {/* Feature icon with animation */}
                    <div className="relative z-10">
                      <div className="rounded-2xl bg-[#fafafa] p-5 w-16 h-16 mb-7 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:bg-[#BCE704]/10 transition-all duration-300">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1] 
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <Zap className="h-7 w-7 text-[#BCE704]" />
                        </motion.div>
                      </div>
                      
                      <h3 className="text-2xl font-['Poppins'] font-bold text-black mb-4 tracking-tight">AI Risk Management</h3>
                      <p className="text-gray-600 font-light leading-relaxed mb-8">
                        Our AI multi-factor model protects both buyers and sellers. Import your reputation from major exchanges for preferential conditions.
                      </p>
                    </div>
                    
                    {/* Enhanced AI Risk Management illustration */}
                    <div className="relative h-56 rounded-2xl overflow-hidden bg-[#fafafa] z-0 border border-[#f5f5f5]">
                      {/* Background patterns */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" fill="none">
                        {/* Subtle grid pattern */}
                        <pattern id="ai-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
                        </pattern>
                        <rect width="400" height="220" fill="url(#ai-grid)" fillOpacity="0.6" />
                        
                        {/* Neural network connections - decorative background */}
                        <g opacity="0.3">
                          <motion.path 
                            d="M50,50 C100,20 150,80 200,50 C250,20 300,80 350,50" 
                            stroke="#E0E0E0" 
                            strokeWidth="1" 
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, delay: 0.2 }}
                          />
                          <motion.path 
                            d="M50,80 C100,50 150,110 200,80 C250,50 300,110 350,80" 
                            stroke="#E0E0E0" 
                            strokeWidth="1" 
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, delay: 0.4 }}
                          />
                          <motion.path 
                            d="M50,110 C100,80 150,140 200,110 C250,80 300,140 350,110" 
                            stroke="#E0E0E0" 
                            strokeWidth="1" 
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, delay: 0.6 }}
                          />
                          <motion.path 
                            d="M50,140 C100,110 150,170 200,140 C250,110 300,170 350,140" 
                            stroke="#E0E0E0" 
                            strokeWidth="1" 
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, delay: 0.8 }}
                          />
                        </g>
                        
                        {/* AI Brain Container */}
                        <motion.circle 
                          cx="200" 
                          cy="110" 
                          r="85" 
                          fill="white" 
                          stroke="#f0f0f0" 
                          strokeWidth="1"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 1 }}
                        />
                      </svg>
                      
                      {/* Central AI visualization */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="w-full h-full relative flex items-center justify-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.8 }}
                        >
                          {/* Network nodes and connections */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" fill="none">
                            {/* Neural network active connections - animated */}
                            <g>
                              {/* Input nodes */}
                              <motion.circle cx="100" cy="70" r="6" fill="white" stroke="#BCE704" strokeWidth="1.5" 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                              />
                              <motion.circle cx="100" cy="110" r="6" fill="white" stroke="#BCE704" strokeWidth="1.5" 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.3 }}
                              />
                              <motion.circle cx="100" cy="150" r="6" fill="white" stroke="#BCE704" strokeWidth="1.5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.4 }}
                              />
                              
                              {/* Hidden layer 1 */}
                              <motion.circle cx="160" cy="60" r="6" fill="white" stroke="#BCE704" strokeWidth="1.5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.5 }}
                              />
                              <motion.circle cx="160" cy="100" r="6" fill="white" stroke="#BCE704" strokeWidth="1.5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.6 }}
                              />
                              <motion.circle cx="160" cy="140" r="6" fill="white" stroke="#BCE704" strokeWidth="1.5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.7 }}
                              />
                              <motion.circle cx="160" cy="180" r="6" fill="white" stroke="#BCE704" strokeWidth="1.5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.8 }}
                              />
                              
                              {/* Hidden layer 2 */}
                              <motion.circle cx="240" cy="70" r="6" fill="white" stroke="#BCE704" strokeWidth="1.5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.9 }}
                              />
                              <motion.circle cx="240" cy="110" r="8" fill="white" stroke="#BCE704" strokeWidth="2"
                                initial={{ opacity: 0 }}
                                animate={{ 
                                  opacity: 1,
                                  boxShadow: ["0 0 0 rgba(188,231,4,0)", "0 0 8px rgba(188,231,4,0.5)", "0 0 0 rgba(188,231,4,0)"]
                                }}
                                transition={{ 
                                  opacity: { duration: 0.3, delay: 1.0 },
                                  boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                }}
                              />
                              <motion.circle cx="240" cy="150" r="6" fill="white" stroke="#BCE704" strokeWidth="1.5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 1.1 }}
                              />
                              
                              {/* Output node */}
                              <motion.circle cx="300" cy="110" r="8" fill="white" stroke="#BCE704" strokeWidth="2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 1.2 }}
                              />
                              
                              {/* Connections */}
                              {/* Input to hidden layer 1 */}
                              <motion.path d="M106,70 L154,60" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ duration: 0.5, delay: 1.3 }}
                              />
                              <motion.path d="M106,70 L154,100" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ duration: 0.5, delay: 1.4 }}
                              />
                              <motion.path d="M106,110 L154,60" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.3"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.3 }}
                                transition={{ duration: 0.5, delay: 1.5 }}
                              />
                              <motion.path d="M106,110 L154,140" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ duration: 0.5, delay: 1.6 }}
                              />
                              <motion.path d="M106,150 L154,140" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.3"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.3 }}
                                transition={{ duration: 0.5, delay: 1.7 }}
                              />
                              <motion.path d="M106,150 L154,180" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ duration: 0.5, delay: 1.8 }}
                              />
                              
                              {/* Hidden layer 1 to hidden layer 2 */}
                              <motion.path d="M166,60 L234,70" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ duration: 0.5, delay: 1.9 }}
                              />
                              <motion.path d="M166,100 L234,70" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.3"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.3 }}
                                transition={{ duration: 0.5, delay: 2.0 }}
                              />
                              <motion.path d="M166,100 L234,110" stroke="#BCE704" strokeWidth="2" strokeOpacity="0.8"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.8 }}
                                transition={{ duration: 0.5, delay: 2.1 }}
                              />
                              <motion.path d="M166,140 L234,110" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ duration: 0.5, delay: 2.2 }}
                              />
                              <motion.path d="M166,140 L234,150" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.3"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.3 }}
                                transition={{ duration: 0.5, delay: 2.3 }}
                              />
                              <motion.path d="M166,180 L234,150" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ duration: 0.5, delay: 2.4 }}
                              />
                              
                              {/* Hidden layer 2 to output */}
                              <motion.path d="M246,70 L294,110" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ duration: 0.5, delay: 2.5 }}
                              />
                              <motion.path d="M246,110 L294,110" stroke="#BCE704" strokeWidth="2" strokeOpacity="0.8"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.8 }}
                                transition={{ duration: 0.5, delay: 2.6 }}
                              />
                              <motion.path d="M246,150 L294,110" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ duration: 0.5, delay: 2.7 }}
                              />
                              
                              {/* Animated data flow */}
                              <motion.circle r="3" fill="#BCE704" opacity="0.8"
                                initial={{ opacity: 0 }}
                                animate={{ 
                                  opacity: [0, 0.8, 0],
                                  offsetDistance: ["0%", "100%"]
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: 3,
                                  repeatDelay: 5
                                }}
                                style={{ offsetPath: "path('M106,110 L154,140 L234,110 L294,110')" }}
                              />
                            </g>
                          </svg>
                          
                          {/* Floating badges with AI metrics */}
                          <motion.div
                            className="absolute top-12 right-14 bg-white px-3 py-1.5 rounded-lg shadow-sm flex items-center space-x-2 border border-[#f0f0f8]"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 2.8 }}
                          >
                            <svg className="w-4 h-4 text-[#BCE704]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs font-medium text-gray-700">99.4% Accuracy</span>
                          </motion.div>
                          
                          <motion.div
                            className="absolute bottom-12 left-14 bg-white px-3 py-1.5 rounded-lg shadow-sm flex items-center space-x-2 border border-[#f0f0f8]"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 3 }}
                          >
                            <svg className="w-4 h-4 text-[#BCE704]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-xs font-medium text-gray-700">Real-time Analysis</span>
                          </motion.div>
                        </motion.div>
                      </div>
                      
                      {/* Badge label */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <motion.div
                          className="bg-white px-5 py-2 rounded-full shadow-sm flex items-center space-x-2 border border-[#f0f0f8]"
                          initial={{ y: 20, opacity: 0 }}
                          whileInView={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 3.2 }}
                          viewport={{ once: true }}
                          whileHover={{ 
                            y: -2, 
                            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)",
                            transition: { duration: 0.2 }
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-[#BCE704]"></div>
                          <span className="font-medium text-sm text-gray-700 tracking-wide">AI Protection</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Feature Card 3 - Transaction Receipts */}
                <motion.div 
                  className="group rounded-3xl overflow-hidden"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.3 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ 
                    boxShadow: "0 20px 80px rgba(188, 231, 4, 0.07)",
                    y: -6,
                    transition: { duration: 0.4 }
                  }}
                >
                  <div className="bg-white p-10 rounded-3xl h-full border border-[#f5f5f5] relative overflow-hidden transition-all duration-500">
                    {/* Feature icon with animation */}
                    <div className="relative z-10">
                      <div className="rounded-2xl bg-[#fafafa] p-5 w-16 h-16 mb-7 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:bg-[#BCE704]/10 transition-all duration-300">
                        <motion.div
                          whileHover={{ 
                            scale: 1.2,
                            rotate: 10,
                            transition: { duration: 0.3 }
                          }}
                        >
                          <FileCheck className="h-7 w-7 text-[#BCE704]" />
                        </motion.div>
                      </div>
                      
                      <h3 className="text-2xl font-['Poppins'] font-bold text-black mb-4 tracking-tight">Transaction Receipts</h3>
                      <p className="text-gray-600 font-light leading-relaxed mb-8">
                        Each transaction creates a legally-binding contract between buyer and seller. Use it to validate the legitimacy of your transaction.
                      </p>
                    </div>
                    
                    {/* Enhanced Transaction Receipts illustration */}
                    <div className="relative h-56 rounded-2xl overflow-hidden bg-[#fafafa] z-0 border border-[#f5f5f5]">
                      {/* Background patterns */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" fill="none">
                        {/* Subtle grid pattern */}
                        <pattern id="receipt-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
                        </pattern>
                        <rect width="400" height="220" fill="url(#receipt-grid)" fillOpacity="0.6" />
                        
                        {/* Paper texture - dotted overlay */}
                        <pattern id="dots-pattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <circle cx="1" cy="1" r="0.5" fill="#f0f0f0" />
                        </pattern>
                        <rect x="50" y="20" width="300" height="180" fill="url(#dots-pattern)" fillOpacity="0.3" rx="8" />
                      </svg>
                      
                      {/* Main receipt container with shadow */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="relative"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.8 }}
                        >
                          {/* Transaction document */}
                          <motion.div 
                            className="relative bg-white w-[260px] h-[160px] rounded-lg shadow-lg overflow-hidden border border-[#f1f1f1]"
                            animate={{ 
                              y: [-3, 3, -3],
                              rotate: [-0.5, 0.5, -0.5] 
                            }}
                            transition={{
                              duration: 5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            whileHover={{ y: -5, scale: 1.02 }}
                          >
                            {/* Receipt header */}
                            <div className="bg-gradient-to-r from-[#fafafa] to-white py-2 px-4 border-b border-[#f1f1f1] flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12Z" stroke="#BCE704" strokeWidth="1.5" />
                                  <path d="M15.5 12C15.5 9.87 13.87 8.11 11.81 8.01C11.87 8 11.94 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16C9.79 16 8 14.21 8 12H7.5C7.5 14.49 9.51 16.5 12 16.5C14.49 16.5 16.5 14.49 16.5 12C16.5 9.79 14.97 7.93 12.96 7.55C12.95 7.55 12.94 7.55 12.93 7.55C14.42 7.88 15.5 9.3 15.5 11C15.5 11.16 15.48 11.32 15.46 11.47C15.48 11.65 15.5 11.82 15.5 12Z" fill="#BCE704" />
                                </svg>
                                <span className="text-sm font-medium text-gray-800">Transaction Receipt</span>
                              </div>
                              <span className="text-xs font-medium text-gray-500">21 Mar 2025</span>
                            </div>
                            
                            {/* Receipt content */}
                            <div className="px-4 py-3">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Amount:</span>
                                  <span className="text-sm font-medium">2,500 USDC</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Fiat Value:</span>
                                  <span className="text-sm font-medium">$2,500.00 USD</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Payment Method:</span>
                                  <span className="text-sm font-medium">Bank Transfer</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Status:</span>
                                  <div className="bg-[#BCE704]/20 px-2 py-0.5 rounded-full flex items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#BCE704] mr-1"></div>
                                    <span className="text-xs font-medium text-[#687d05]">Confirmed</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Receipt footer with signature */}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-b from-white via-[#fafafa] to-[#f7f7f7] px-4 py-3 border-t border-[#f1f1f1] flex justify-between items-center">
                              <div className="flex items-center space-x-1">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9 12L11 14L15 10" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="#BCE704" strokeWidth="1.5"/>
                                </svg>
                                <span className="text-xs text-gray-600 font-medium">Verified on-chain</span>
                              </div>
                              <div className="flex items-center">
                                <motion.svg 
                                  width="60" 
                                  height="24" 
                                  viewBox="0 0 60 24" 
                                  className="text-[#BCE704]"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 1.5, delay: 0.5 }}
                                >
                                  <path d="M5,16 C8,8 13,18 18,12 C23,6 25,14 30,10 C35,6 40,16 45,12 C50,8 55,12 58,8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                </motion.svg>
                              </div>
                            </div>
                            
                            {/* Hash pattern overlay - subtle security pattern */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                <pattern id="hashPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                                  <path d="M0,10 L20,10 M10,0 L10,20" stroke="#000" strokeWidth="0.5" />
                                </pattern>
                                <rect width="100%" height="100%" fill="url(#hashPattern)" />
                              </svg>
                            </div>
                          </motion.div>
                          
                          {/* Floating verification elements */}
                          <motion.div 
                            className="absolute -top-10 -right-10 bg-white w-16 h-16 rounded-full shadow-md border border-[#f3f3f3] flex items-center justify-center"
                            animate={{ 
                              y: [-4, 2, -4],
                              x: [2, -2, 2],
                              rotate: [0, 5, 0]
                            }}
                            transition={{
                              duration: 6,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4"/>
                              <path d="M9 13.7L12 10.7L15 13.7" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10.5 10.5H13.5C15.15 10.5 16.5 9.14 16.5 7.5C16.5 5.85 15.15 4.5 13.5 4.5H10.5C8.85 4.5 7.5 5.85 7.5 7.5C7.5 9.14 8.85 10.5 10.5 10.5Z" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M12 10.5V19.5" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </motion.div>
                          
                          <motion.div 
                            className="absolute -bottom-8 -left-10 bg-white w-12 h-12 rounded-full shadow-md border border-[#f3f3f3] flex items-center justify-center"
                            animate={{ 
                              y: [3, -3, 3],
                              x: [-3, 1, -3],
                              rotate: [0, -5, 0]
                            }}
                            transition={{
                              duration: 5,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.5
                            }}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 2V5" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 2V5" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M3.5 9.09H20.5" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4"/>
                              <path d="M15.6947 13.7H15.7037" stroke="#BCE704" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M15.6947 16.7H15.7037" stroke="#BCE704" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M11.9955 13.7H12.0045" stroke="#BCE704" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M11.9955 16.7H12.0045" stroke="#BCE704" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8.29431 13.7H8.30329" stroke="#BCE704" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8.29431 16.7H8.30329" stroke="#BCE704" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </motion.div>
                          
                          {/* Animated verification stamp */}
                          <motion.div
                            className="absolute -top-2 -right-2 w-24 h-24 pointer-events-none"
                            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                            animate={{ 
                              opacity: [0.8, 0.6, 0.8],
                              scale: 1,
                              rotate: -15
                            }}
                            transition={{
                              opacity: {
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                              },
                              scale: {
                                duration: 1,
                                ease: "easeOut"
                              }
                            }}
                          >
                            <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="50" cy="50" r="48" stroke="#BCE704" strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
                              <circle cx="50" cy="50" r="42" stroke="#BCE704" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="2 4" fill="none" />
                              <motion.path
                                d="M34 50L44 60L68 36"
                                stroke="#BCE704"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1, delay: 0.8 }}
                              />
                              <motion.text
                                x="50"
                                y="75"
                                fill="#BCE704"
                                fontSize="7"
                                fontWeight="bold"
                                textAnchor="middle"
                                opacity="0.7"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.7 }}
                                transition={{ duration: 0.5, delay: 1.5 }}
                              >
                                VERIFIED
                              </motion.text>
                            </svg>
                          </motion.div>
                        </motion.div>
                      </div>
                      
                      {/* Badge label */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <motion.div
                          className="bg-white px-5 py-2 rounded-full shadow-sm flex items-center space-x-2 border border-[#f0f0f8]"
                          initial={{ y: 20, opacity: 0 }}
                          whileInView={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 1.5 }}
                          viewport={{ once: true }}
                          whileHover={{ 
                            y: -2, 
                            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)",
                            transition: { duration: 0.2 }
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-[#BCE704]"></div>
                          <span className="font-medium text-sm text-gray-700 tracking-wide">Legally Verified</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Feature Card 4 - Global Coverage */}
                <motion.div 
                  className="group rounded-3xl overflow-hidden"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.4 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ 
                    boxShadow: "0 20px 80px rgba(188, 231, 4, 0.07)",
                    y: -6,
                    transition: { duration: 0.4 }
                  }}
                >
                  <div className="bg-white p-10 rounded-3xl h-full border border-[#f5f5f5] relative overflow-hidden transition-all duration-500">
                    {/* Feature icon with animation */}
                    <div className="relative z-10">
                      <div className="rounded-2xl bg-[#fafafa] p-5 w-16 h-16 mb-7 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:bg-[#BCE704]/10 transition-all duration-300">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        >
                          <Globe className="h-7 w-7 text-[#BCE704]" />
                        </motion.div>
                      </div>
                      
                      <h3 className="text-2xl font-['Poppins'] font-bold text-black mb-4 tracking-tight">Global Coverage</h3>
                      <p className="text-gray-600 font-light leading-relaxed mb-8">
                        All countries, all payment methods. Our platform adapts to local payment methods and currencies everywhere you go.
                      </p>
                    </div>
                    
                    {/* Enhanced Global Coverage illustration */}
                    <div className="relative h-56 rounded-2xl overflow-hidden bg-[#fafafa] z-0 border border-[#f5f5f5]">
                      {/* Background patterns */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" fill="none">
                        {/* Subtle grid pattern */}
                        <pattern id="global-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
                        </pattern>
                        <rect width="400" height="220" fill="url(#global-grid)" fillOpacity="0.6" />
                        
                        {/* World map outline - subtle background */}
                        <g opacity="0.07" transform="translate(50, 25) scale(0.75)">
                          <path d="M313.6,315.59c15.14-9.89,11.11,1.93,22.41-2.15c0.81-4.47,3.33-10.72,6.03-14.87c-0.44-8.07-7.81-9.62-7.05-18.39
                            c3.41-0.67,8.23,3.64,11.57,1.87c-3.022-6.299-10.84-7.8-12.22-16.851c1.41-2.8,1.57-6.85,4.32-8.87h6.16
                            c-2.64-5.66-7.04-11.49-4.32-18.39c-7.46-1.28-8.3-9.19-14.91-11.18c-1.38,0.95-3.8,2.709-5.79,2.8
                            c0.2-5.16-5.04-7.13-8.48-4.67c-0.44,4.76-5.51,3.2-7.06,6.54c-2.14-0.38-3.9-2.5-4.53-4.67c5.3-4.66,11.77-10.06,9.99-18.39
                            c-2.21-0.73-3.63-2.25-5.17-3.73c4.25-2.23,8.56-10.98,2.83-13.44c-3.06,3.67-10.81,5.24-14.05,1.86
                            c-0.61-3.96,4.88-7.35,1.68-11.18c-5.37-1.51-10.05-7.24-16.59-4.66c-3.09,0.77-8.5,0.99-10.72,3.73c-0.23,2.8,3.06,5.14,2.45,7.48
                            c-2.45,3.31-5.31-1.99-7.03-0.94c-3.48,1.95-2.9,8.1-7.43,9.32c2.06,6.95-9.43,8.94-4.9,16.53c-3.54,2.27-8.35,5.79-10.26,9.31
                            c5.75,5.211,12.91,9.19,15.01,16.531c-1.12,7.06-11.36,8.029-16.69,12.109c-4.23-0.58-1.65-11.329-7.43-10.239
                            c-8.79,1.66-6.13,15.359-14.97,17.45c-3.84,0.57-6.78-2.21-10.72-1.87c-3.08,5.9,4.01,8.66,7.89,11.18
                            c3.06,5.19-4.65,7.37-3.59,11.65c1.49,6.201,9.56,9.801,9.3,17.11c-0.32,1.531-1.98,2.93-2.24,4.67
                            c0.84,6.04,6.44,7.98,11.57,10.25c5.24,8.96-9.52,5.889-8.48,14c0.86,2.139,3.37,3.759,3.59,6.52c-0.1,2.24-3.35,2.681-3.97,4.67
                            c0.09,3.369,4.51,7.47,1.69,10.24c-3.9,0.75-8.28,0.9-12.22,0c-0.79-6.47-11.19-8.029-9.8-14.869c0.97-1.531,2.93-0.42,3.97-1.87
                            c-0.43-4.75-4.6-5.03-6.4-8.38c-4.23,0.78-3.97,5.659-6.59,8.38c-2.3,0.931-4.73-0.5-6.97-0.939c-0.34-3.45-2.21-6.44-4.52-8.38
                            c0.4-3.43-1.74-4.32-4.14-5.601c-9.02,3.881-17.13-2.93-25.17-3.73c-20.33-2.028-41.2-3.979-61.83-3.73
                            c-8.81,0.12-17.49,2.67-26.27,3.73c-4.4,0.531-8.97,0.591-13.24,0.93c-4.86,0.41-9.8-0.56-14.71-0.93
                            c-11.77-0.88-24.07-0.358-35.13,2.8c-3.61-0.068-3.58-5.149-6.03-7.44c5.36-7.12,8.64-15.642,10.72-24.5
                            c2.76-3.801,9.37-2.9,13.9-4.67c3.18,1.139,7.77,1.479,8.85,4.67c1.04,3.049-1.98,4.649-2.83,6.54
                            c1.33,3.069,4.33,5.149,7.42,6.54c3.1-3.471,7.06-7.64,11.57-9.341c3.99,0.17,9.35,2.25,12.22-0.93c1.4-3.88-3.13-5.95-2.83-9.34
                            c5.37-2.92,13.09-4.059,15.29-10.24c-3.14-3.471-8.33-1.95-10.35-6.54c-1.26-2.671,0.55-4.32,1.51-6.54
                            c-1.8-6.181-10.02-10.99-7.05-18.39c2.12-1.561,5.44-0.811,7.05-2.8c-0.43-6.71,3.63-9.03,8.11-11.65
                            c8.45-1.07,15.59,0.87,22.41,3.73c2.53-8.1-3.01-15.46-9.05-20.26c-3.34-2.66-8.36-4.8-8.29-9.31c0.05-2.53,3.42-3.37,4.14-5.6
                            c-1.25-2.58-4.11-3.56-5.17-6.54c-2.01-2.03-6-1.08-8.1-0.94c-3.56-6.85-1.25-15.45-3.97-22.12c-0.92-2.26-4.54-3.08-4.33-5.6
                            c0.71-8.5,9.58-17.01,18.22-17.45c2.79,0.58,5.72,0.2,8.85,0.94c6.76,7.49,11.93,16.68,22.22,20.26
                            c9.13,3.17,18.84,1.38,27.77,4.66c1.13,10.16,4.94,20.01,10.35,28.23c2.74,4.15,8.35,2.84,11.57,0c3.5-3.07,5.37-7.47,5.66-12.11
                            c-3.08-3.36-9.7-3.95-10.34-9.32c-0.6-4.98,0.69-10.2,2.26-14.93c-3.18-5-6.99-10.69-13.43-11.65c-7.34-1.09-14.08,2.89-20.73,5.6
                            c-4.39,1.79-8.82,4.15-13.9,3.73c-7.96-0.65-14.18-7.88-22.21-6.54c-4.7,0.78-9.95,1.52-13.05,5.61c-5.6,1.01-12.04,1.66-16.96,4.66
                            c-2.73,4.79-0.64,11.17-1.13,16.53c-0.71,7.74-3.16,15.74-8.48,21.19c-6.86,2.26-12.76-2.92-17.82-6.54
                            c-2.27-5.29,2.46-9.22,4.51-13.05c1.06-2.75,1.21-5.74,0.94-8.87c-4.57-5.86-9.43-11.71-11.95-18.39
                            c-1.19-5.23,3.34-9.75,2.64-14.87c-0.53-3.93-5.39-5.38-7.05-8.87c-1.1-7.18,9.12-10.89,5.54-18.4
                            c-1.01-2.08-3.47-2.48-5.17-3.73c-0.45-9.2,11.21-14.7,8.67-24.91c-0.67-2.7-3.87-2.95-5-4.66c-3.42-5.2-0.35-11.75-1.51-17.45
                            c-0.52-2.53-3.21-3.76-5.16-4.67c-11.84-1.27-24.97-1.29-34-9.31c-3.8-3.37-4.82-10.31-10.92-8.87c-9.32,2.19-12.99,12.43-21.09,15.8
                            c-3.9-1.86-7.74-4.51-10.54-7.47c0.45-12.97,15.32-19.72,14.52-33.84c-0.12-3.18-3.35-4.31-5.35-5.6c-2.05-2.4-1.24-7.3-4.14-8.87
                            c-5.64-3.04-12.38-1.26-17.16,1.86c-4.48,2.93-6.8,7.96-9.61,12.12c-4.48,6.6-11.97,10.24-18.39,14.87
                            c-5.8,4.15-10.19,9.75-12.6,16.51c-1.35,3.81-0.84,8.09-1.51,12.12c-5.22,5.15-11.64,11.32-10.16,19.32
                            c0.91,4.96,3.7,9.57,8.1,12.11c2.64,1.24,5.22,2.57,8.48,2.8c0.05,10.93-1.13,22.18-6.97,31.74
                            c-4.18,6.83-11.22,10.37-16.4,16.05c-2.31,2.53-3.07,6.33-2.07,9.78c0.97,3.4,2.97,6.97,6.22,8.5c8.31,3.93,16.83-0.01,24.8,3.73
                            c1.93,7.37-3.48,12.62-5.92,18.82c-0.37,5.93,7.34,5.91,10.91,8.44c0.48,2.34-0.52,4.65-1.69,6.54c-16,0.34-32.09,1.41-47.91-0.93
                            c-6.68-1-12.85-3.59-19.13-5.61c-3.34-1.08-6.65-2.27-10.35-2.8c-3.56-0.52-7.65-0.71-10.91,0.94c-3.03,1.53-4.42,4.64-6.4,7.47
                            c-0.99,10.69-0.19,21.56-0.56,32.52c-0.19,5.59-1.25,11.11-0.57,16.52c0.43,3.4,2.76,5.7,3.02,9.32c0.27,3.77-2.9,6.81-3.59,10.24
                            c0.81,13.07,0.18,27.03,5.73,39.06c2.38,5.16,8.63,5.939,12.41,9.709c2.88,2.88,3.9,7.03,5.73,10.67
                            c-0.25,2.77-3.89,4.061-3.59,7.48c0.55,6.31,8.83,10.619,9.33,17.439c0.26,3.61-3.47,5.561-3.79,8.871c0.25,3.27,4.81,3.9,4.9,7.449
                            c-0.02,4.73-4.42,6.521-6.97,9.33c-9.67,0.811-19.44,1.449-28.47,5.611c-4.15,1.92-6.92,5.77-10.54,8.369
                            c-3.71,2.67-8.46,3.9-12.03,6.54c-4.57,3.371-6.78,8.871-9.43,13.73c-2.23,10.16-4.52,20.471-3.77,31.029
                            c0.35,4.881,1.08,9.83,3.21,14.4c1.81,3.881,5.54,6.24,8.1,9.32c3.44,4.131,9.44,3.621,14.33,3.73c4.42,0.111,8.87-0.359,13.05-1.869
                            c5.99-2.141,11.91-5.201,18.39-5.611c3.73-0.229,7.69,0.2,10.91,2.061c2.37,1.35,3.82,3.609,5.92,5.139
                            c1.43,1.051,3.11,1.74,4.9,1.73c5.9-0.029,11.54-1.32,17.35-1.73c6.5-4.451,10.96-10.83,16.03-16.529
                            c5.21-5.871,10.32-12.051,17.54-15.602c5.48-2.68,11.7-3.549,17.54-4.67c4.69-0.949,9.62-0.76,14.14-2.059
                            c2.68-0.771,5.34-1.9,7.05-4.221c2.07-2.76,1.61-6.52,3.78-9.33c2.88-3.711,8.04-4.361,10.35-8l0.17-0.061c0-0.27-0.51-0.51-0.17-0.32
                            c6.05-3.109,10.99-8.199,13.81-14.381c5.22-1.029,10.98-0.459,15.38-3.729c3.89-2.9,4.2-7.9,5.35-12.11
                            c2.86-10.09,2.73-20.66,2.07-31.01c-0.51-7.9-1.47-15.79-0.37-23.52c0.38-2.66,1.09-5.24,2.64-7.49c2.13-3.05,5.43-4.709,8.29-6.92
                            c3.48-2.701,7.47-4.59,10.91-7.33c3.54-2.82,5.05-7.13,7.06-10.89c4.82-9.08,9.43-18.61,11.94-28.61c0.88-3.51,1.54-7.39,0.38-10.71
                            c-1.18-3.39-4.16-5.25-6.03-8.03c-5.87-8.69-3.41-19.99,0.38-29.2c3.19-7.72,6.95-15.57,13.24-21.11
                            c1.85-1.63,3.91-3.15,6.4-3.73c4.8-1.13,9.87-0.07,14.33-2.8c2.63-1.61,4.2-4.32,6.03-6.54c3.34-4.05,8.48-5.99,13.05-8.38
                            c12.5-6.49,25.57-11.77,39.48-14.87c3.79-0.85,8.05-1.33,11.76,0c2.99,1.07,4.52,4.06,6.97,5.61
                            c4.28,2.68,9.78,2.23,14.7,1.86c5.26-0.39,10.55-0.17,15.85-0.93c10.11-1.45,20.54-1.11,30.86-1.87c5.93-0.43,12.15-0.49,17.54-3.73
                            c3.32-1.98,4.96-5.48,7.44-8.38c3.58-4.18,8.03-7.61,12.78-10.71c3.92-2.56,7.6-5.53,11.57-8.03c4.56-2.89,9.86-3.56,14.71-5.6
                            c5.28-2.23,10.03-5.39,14.9-8.38c5.38-3.3,10.63-7.13,16.96-8.38c11.87-2.35,24.27,0.18,35.32,3.73
                            c13.79,4.46,25.86,12.73,38.54,19.33c4.7,2.44,9.87,4.34,13.05,8.87c2.8,3.99,2.46,9.41,5.17,13.44
                            c4.15,6.24,11.74,9.15,18.77,10.24c9.02,1.4,19.17,3.56,27.58-0.93c4.18-2.24,7.18-6.14,10.35-9.32
                            c7.45-7.44,15.03-14.86,22.78-21.99c4.92-4.52,10.12-9.03,16.22-11.65c7.4-3.18,15.98-3.11,23.52-0.94
                            c3.66,1.06,7.31,2.67,10.16,5.6c3.08,3.17,3.98,7.56,5.54,11.65c1.89,4.94,3.7,10.27,7.99,13.44c6.37,4.71,14.24,5.22,21.84,6.54
                            c3.58,0.63,7.69,0.85,10.91-0.93c3.03-1.67,4.29-4.96,5.36-8.03c4.85-14.06,9.54-28.17,13.81-42.43c1.39-4.63,2.68-9.33,3.78-14.03
                            c-3.8-1.51-7.94-2.21-11.38-4.66c-0.17-5.99,4.64-10.14,9.23-12.99c3.79-2.34,8.38-3.83,12.79-4.66
                            c7.63-1.42,15.71-1.26,23.06,0.93c0.08,5.58-7.16,11.32-2.63,16.53c3.9,4.52,11.78,5.2,14.14,11.18c1.11,2.82-0.34,5.63-0.19,8.38
                            c0.23,4.43,2.67,8.95,6.59,11.18c1.91,0.36,3.37-1.52,4.9-2.34c1.05-0.57,1.84-2.34,3.02-1.4c0.55,2.31-0.17,4.97-1.7,6.54
                            c-3.85,0.86-7.66,1.96-11.38,3.73c-4.3,2.05-8.93,4.3-11.19,8.87c-0.43,0.87-0.37,2.05-0.94,2.81c-0.68,0.92-1.91,1.18-2.82,1.86
                            c-1.24,0.92-1.66,2.49-2.26,3.73c0.55,2.51,3.71,2.76,5.54,3.73c5.73,3.08,11.11,6.87,15.84,11.18c3.52,3.2,6.96,6.55,9.99,10.24
                            c2.55,3.11,6.87,4.59,8.48,8.38c0.92,2.15,1.11,4.77,2.82,6.54c2.86,2.94,7.13,2.89,10.91,3.73c4.39,0.98,9.03,0.72,13.43,0
                            c3.4-0.55,7.35-1.37,9.8-4.21c1.06-1.23,0.47-2.93,0.38-4.6c-0.59-12.64-7.86-24.15-15.85-33.06c-2.16-2.41-4.62-4.6-7.42-6.54
                            c-4.46-3.09-8.27-7.25-10.35-12.11c-3.32-7.72-1.38-17.38-6.78-24.12c-4.02-5.04-10.81-5.47-16.59-7.47
                            c-6.6-2.29-13.2-6.32-15.83-13.05c-1.22-3.12-1.95-6.61-1.32-10.24c0.68-3.97,2.41-7.86,5.17-10.71c2.96-3.06,6.69-5.25,10.34-7.47
                            c-0.63-7.31-5.95-13.09-10.73-18.4c-2.64-2.94-5.4-5.93-6.96-9.78c-1.04-2.57-1.2-5.7-0.19-8.38c0.97-2.57,3.32-4.09,5.17-5.6
                            c4.62-3.9,10.16-6.5,15.85-8.87c2.33-0.97,5.02-1.2,7.43-0.33c3.34,1.2,4.92,4.98,8.48,5.93c4.91,1.33,8.46-3.06,12.97-4.67
                            c3.59-1.28,7.37-1.63,11.19-1.86c5.54-0.34,11.32,0.32,16.22,2.8c3.56,1.8,5.61,5.42,8.11,8.39c5.33,6.34,12.96,10.14,20.16,13.9
                            c3.95,2.06,8.06,4.75,9.8,9.32c0.62,1.64,0.94,3.34,1.7,4.66c-4.39,7.24-9.61,13.84-14.9,20.26c-1.67,2.04-4.23,2.89-6.4,4.21
                            c-3.67,2.24-5.13,6.97-3.97,10.71c1.41,4.49,5.83,7.35,6.59,12.11c-0.77,11.82-6.46,23.44-15.46,31.19
                            c-5.42,4.68-8.58,11.11-12.03,17.18c-5.39,9.53-10.47,19.45-15.1,29.53c-2.89,6.32-5.7,12.69-7.62,19.33
                            c-1.08,3.71-1.63,7.54-2.45,11.18c-0.37,8.18,6.45,13.79,10.91,19.33c7.74,9.65,13.03,21.03,14.89,33.06
                            c0.65,4.23,0.91,8.48,0.76,12.98c-0.36,11.74-2.41,23.62-7.24,34.3c-1.97,4.371-3.86,8.801-5.35,13.439
                            c-1.23,3.83-2.43,7.811-2.07,11.961c0.25,2.869,1.57,5.379,2.45,8c1.65,4.939,3.41,9.939,6.59,14.059
                            c1.52,1.971,3.35,3.811,5.54,4.99c4.07,2.182,9.07,1.172,13.24-0.189c8.47-2.762,15.33-8.391,22.41-13.451
                            c6.92-4.939,14.37-8.969,21.84-12.969c5.16-2.76,10.02-6.07,15.1-9.01c5.16-2.99,10.98-4.811,16.77-6.15
                            c6.63-1.529,13.43-2.289,20.16-2.33c6.69-0.051,13.48,0.559,19.95,2.33c12.76,3.51,23.62,11.381,36.27,15.77
                            c4.88,1.689,10.11,2.66,15.29,2.65c5.2-0.01,10.27-1.189,15.29-2.65c3.9-1.141,7.96-1.93,11.57-3.879
                            c2.44-1.311,4.55-3.041,6.4-5.01h4.15c7.81,6.76,15.83,13.299,22.03,21.291c2.54,3.27,4.58,6.809,5.92,10.67
                            c0.43,1.25,0.56,2.6,0.94,3.74c0.64,1.939,1.59,3.789,2.82,5.4c-0.93,8.26-0.16,16.76-2.07,24.689c-1.8,7.49-6.95,13.91-13.05,18.4
                            c-6.62,4.869-13.68,9.109-19.39,15.029c-2.37,2.451-4.25,5.281-5.54,8.371c-1.43,3.412-1.84,7.141-2.45,10.68
                            c-1.33,7.779-3.17,15.629-6.78,22.77c-1.51,2.971-3.24,5.852-5.54,8.369c-1.73,1.9-3.97,3.23-5.73,5.02
                            c-2.64,2.68-4.3,6.09-5.92,9.42c-1.38,2.83-1.92,5.951-2.64,9c-1.19,5.051-2.98,9.99-5.54,14.48c-1.98,3.461-4.4,6.74-7.42,9.42
                            c-4.15,3.682-9.25,6.092-14.52,7.859c-4.52,1.52-9.42,1.49-14.14,1.502c-4.56,0.01-9.01-0.631-13.43-1.871
                            c-15.51-4.35-27.44-15.949-37.79-27.43c-4.35-4.82-8.47-9.82-12.41-14.99c-4.12-5.42-7.98-11.01-11.75-16.641
                            c-15.19-22.629-31.23-45.029-50.5-63.898c-3.15-3.07-6.52-5.951-10.16-8.371c-3.52-2.338-7.58-3.449-11.57-4.67
                            c-3.75-1.15-7.81-1.629-11.57-0.561c-3.52,1-6.37,3.371-9.23,5.611c-4.31,3.359-8.51,6.84-12.6,10.51
                            c-3.16,2.83-6.17,5.801-9.24,8.699c-5.54,5.252-11.02,10.57-15.65,16.631c-4.12,5.4-7.39,11.42-10.73,17.439
                            c-4.22,7.602-8.45,15.141-12.97,22.422c-5.76,9.299-11.94,18.359-18.96,26.77c-3.55,4.26-7.4,8.24-11.57,11.879
                            c-3.89,3.391-8.22,6.281-12.78,8.73c-4.92,2.641-10.47,3.66-15.85,4.67c-5.27,0.99-10.1,3.061-15.1,4.67
                            c-5.25,1.691-10.82,1.861-16.4,1.871c-5.54,0.01-11.05-0.311-16.4-1.871c-5.25-1.541-10.83-2.949-15.09-6.539
                            c-3.6-3.041-6.08-7.051-8.29-11.061c-5.36-9.74-8.95-20.25-14.33-29.969c-2.55-4.621-5.42-9.051-8.29-13.441
                            c-2.77-4.229-5.46-8.51-8.1-12.859c-1.32-2.17-2.69-4.311-4.53-6.16c-2.03-2.031-4.65-3.3-7.42-4.1c-8.12-2.311-16.78-1.381-25.17-1.5
                            c-8.63-0.121-17.3-0.131-25.92-0.131c-3.99,0-8.14-0.67-11.95,0.561c-2.13,0.689-3.89,2.16-5.35,3.73
                            c-12.44,13.4-21.01,29.76-27.96,46.51c-4.85,11.699-9.94,23.449-9.42,36.449c0.76,18.781,13.59,35.08,29.84,42.891
                            c8.65,4.15,18.25,5.91,27.77,6.16c12.51,0.33,25.28-1.25,36.83-6.16c8.99-3.82,17.22-9.23,24.98-15.02
                            c7.13-5.311,13.47-11.49,19.58-17.99c-1.27,2.08-2.57,4.16-3.97,6.17c-3.48,5.039-6.82,10.51-7.42,16.77
                            c-0.15,1.59,0.31,3.17,0.56,4.67c-5.84,3.52-12.34,6.07-19.01,7.459c-11.64,2.432-23.85,1.912-35.32-0.93
                            c-5.28-1.301-10.49-2.99-15.29-5.6c-7.59-4.141-14.27-9.941-19.02-17.01c-4.6-6.83-6.85-14.99-7.61-23.24
                            c-0.72-7.789-0.17-15.689,1.13-23.33c1.31-7.721,3.42-15.289,5.92-22.59c1.39-4.061,2.95-8.09,4.9-11.9
                            c1.96-3.84,3.99-7.660,6.4-11.33c2.01-3.062,4.34-5.91,5.92-9.23c1.42-2.99,2.67-6.07,3.21-9.33c-1.5-1.381-3.63-1.381-5.54-1.869
                            c-4.92-1.26-9.04-4.211-12.97-7.471c-4.09-3.389-7.55-7.42-10.35-11.859c-2.22-3.512-3.68-7.471-5.16-11.33
                            c-6.79-17.891-9.48-37.201-9.99-56.4c-0.41-15.389,0.62-30.91,3.21-46.139c0.86-5.08,2.43-10.051,3.4-15.09
                            c0.91-4.711,1.61-9.48,1.7-14.311c0.11-6.139-0.42-12.279-0.75-18.389c-0.41-7.611,0.43-15.23,0.75-22.801
                            c0.43-9.609,0.22-19.289-0.75-28.799c-0.97-9.551-3.35-18.871-5.35-28.24c-0.88-4.16-1.65-8.359-2.07-12.641
                            c-0.38-3.949,0.43-7.879,0.76-11.779c0.24-2.9,0.38-5.801,0-8.699c-0.36-2.73-1.05-5.48-2.64-7.861
                            c-6.12-9.129-16.67-12.359-25.73-17.379c-4.92-2.73-10.13-5.82-13.05-10.711c-1.43-2.379-2.1-5.059-2.82-7.73
                            c-1.97-7.329-2.54-15.059-1.5-22.6c0.45-3.271,1.23-6.49,2.45-9.601c5.11-13.059,13.21-24.629,22.03-35.289
                            c3.84-4.65,7.93-9.141,12.6-13.041c8.12-6.729,17.99-10.379,27.4-14.75c5.55-2.58,11.64-5.31,17.91-5.199
                            c3.7,0.068,7.07,1.66,10.35,3.33c5.92,3.01,11.4,7.049,16.02,11.629c3.8,3.77,6.84,8.141,9.8,12.6
                            c5.9,8.881,14.22,16.141,24.23,19.33c3.97,1.26,8.15,1.9,12.22,1.4c5.24-0.64,10.41-2.6,14.52-5.939
                            c2.08-1.69,3.87-3.721,5.54-5.801c4.47-5.609,8.12-11.77,11.57-18.141c3.06-5.619,6.6-11.139,11.19-15.68
                            c5.06-5,11.54-9.029,18.77-9.949c7.38-0.941,15.03-0.641,22.03,1.729c6.37,2.16,11.44,6.82,15.85,11.83
                            c3.82,4.35,7.43,9.07,9.42,14.75c1.11,3.181,1.47,6.561,2.26,9.859c1.58,6.541,4.62,12.98,9.61,17.52
                            c1.89,1.719,4.06,3.129,6.59,3.49c5.89,0.82,11.92-0.89,17.16-3.49c7.27-3.611,13.63-8.711,19.58-14.121
                            c5.52-5.02,11.09-9.969,17.16-14.229c9.23-6.471,19.87-10.811,31.05-12.41c3.46-0.5,7-0.48,10.35,0.6
                            c6.73,2.16,11.93,7.971,15.84,13.811c4.8,7.139,9.78,15.039,18.02,18.33c3.66,1.461,7.6,1.74,11.38,2.59
                            c3.03,0.682,6.25,1.26,9.42,0.811c2.76-0.39,5.12-2.9,7.87-2.641c-0.18,6.58-0.65,13.15-0.57,19.73
                            c0.09,7.5,1.5,14.9,1.51,22.41c0,4.719-0.56,9.43-0.75,14.131c-0.2,4.869,0.58,9.699,1.5,14.42
                            c0.85,4.321,1.62,8.75,1.51,13.211c-0.25,10.59-4.13,20.779-6.78,30.93c-2.02,7.75-3.7,15.641-3.97,23.75
                            c-0.12,3.52-0.06,7.039,0.38,10.629c0.57,4.7,1.75,9.32,3.59,13.611c4.61,10.609,12.84,19.129,22.4,25.119
                            c3.01,1.881,6.27,3.391,9.43,4.811c3.85,1.74,7.9,2.92,11.95,4.16c9.18,2.811,18.77,3.939,28.29,4.85
                            c26.41,2.52,53.28,0.85,79.36-4.291c13.07-2.549,25.98-5.719,38.72-9.479c3.52-1.041,6.93-2.48,10.29-3.92
                            c2.26-0.971,4.5-1.891,6.96-2.15c3.53-0.359,7.04,0.461,10.54,0.811c2.14,0.221,4.5,0.711,6.4-0.43c1.98-1.191,3.13-3.441,3.42-5.611
                            c0.66-4.949-3.11-8.959-6.97-11.369c-8.52-5.301-18.14-8.711-27.58-12.1c-7.21-2.59-14.08-6.08-20.92-9.791
                            c-6.46-3.51-12.49-7.74-18.4-12.1c-2.8-2.061-5.58-4.1-8.09-6.551c-2.31-2.26-4.29-4.75-6.03-7.469
                            c-2.92-4.541-5.07-9.49-7.05-14.431c-3.73-9.24-6.91-18.6-11.01-27.66c-3.55-7.85-9.24-14.44-14.71-21.18
                            c-3.14-3.87-6.26-7.91-8.1-12.6c-1.24-3.17-1.54-6.55-1.51-9.92c0.04-4.43,0.44-8.93,1.89-13.04c1.59-4.53,4.04-8.8,7.62-12.12
                            c6.33-5.88,14.94-8.07,23.15-9.32c3.22-0.49,6.55-0.88,9.81-0.56c2.77,0.27,5.49,1.08,7.99,2.33c5.46,2.75,9.84,7.07,14.52,11.19"
                          />
                        </g>
                      </svg>
                      
                      {/* Main container */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="relative"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1 }}
                        >
                          {/* Main globe element */}
                          <div className="relative">
                            {/* Background circle */}
                            <motion.div 
                              className="absolute w-52 h-52 rounded-full bg-gradient-to-br from-white to-[#f8f8f8] left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 border border-[#f2f2f2]"
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 1 }}
                            />
                            
                            {/* Orbit rings */}
                            <motion.div
                              className="absolute w-[210px] h-[210px] left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                              animate={{ rotate: 360 }}
                              transition={{
                                repeat: Infinity,
                                duration: 45,
                                ease: "linear"
                              }}
                            >
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 210 210" fill="none">
                                <ellipse cx="105" cy="105" rx="103" ry="70" transform="rotate(25 105 105)" stroke="#e5e5e5" strokeWidth="1" strokeDasharray="2 4" />
                              </svg>
                              
                              {/* Orbiting elements - countries/regions */}
                              {[15, 70, 140, 200, 260, 320].map((angle, i) => (
                                <motion.div
                                  key={i}
                                  className="absolute"
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    left: "50%",
                                    top: "50%",
                                    transform: `rotate(${angle}deg) translate(85px, 0) translate(-50%, -50%) rotate(-${angle}deg)`,
                                  }}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.5, delay: 0.2 * i }}
                                >
                                  <div className="bg-white p-1.5 rounded-full shadow-md border border-[#f0f0f0] flex items-center justify-center">
                                    {/* Region icons - customize with actual country flags or region symbols */}
                                    {i === 0 && (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#BCE704" strokeWidth="1.5" />
                                        <path d="M8 3H9.5C7.5 8 7.5 16 9.5 21H8" stroke="#BCE704" strokeWidth="1.5" />
                                        <path d="M14.5 3H16C14 8 14 16 16 21H14.5" stroke="#BCE704" strokeWidth="1.5" />
                                        <path d="M3 16V14.5C8 16.5 16 16.5 21 14.5V16" stroke="#BCE704" strokeWidth="1.5" />
                                        <path d="M3 9.5V8C8 10 16 10 21 8V9.5" stroke="#BCE704" strokeWidth="1.5" />
                                      </svg>
                                    )}
                                    {i === 1 && (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9.25 7C9.25 8.24264 8.24264 9.25 7 9.25C5.75736 9.25 4.75 8.24264 4.75 7C4.75 5.75736 5.75736 4.75 7 4.75C8.24264 4.75 9.25 5.75736 9.25 7Z" stroke="#BCE704" strokeWidth="1.5" />
                                        <path d="M6.75 9.5V14.5" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                        <path d="M10.75 12.5L6.75 14.5L2.75 12.5" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14.75 17.75H18.25" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                        <path d="M14.75 14.75H18.25" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                        <path d="M21.25 2.75H2.75V21.25H21.25V2.75Z" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                    {i === 2 && (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2 19.5H22" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M2 12H22" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M2 4.5H22" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                    {i === 3 && (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 12V19C18 20.6569 16.6569 22 15 22H9C7.34315 22 6 20.6569 6 19V5C6 3.34315 7.34315 2 9 2H15C16.6569 2 18 3.34315 18 5V8" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M18 16C19.1046 16 20 15.1046 20 14V6C20 4.89543 19.1046 4 18 4C16.8954 4 16 4.89543 16 6V14C16 15.1046 16.8954 16 18 16Z" stroke="#BCE704" strokeWidth="1.5"/>
                                      </svg>
                                    )}
                                    {i === 4 && (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 6.2C3 5.07989 3 4.51984 3.21799 4.09202C3.40973 3.71569 3.71569 3.40973 4.09202 3.21799C4.51984 3 5.07989 3 6.2 3H17.8C18.9201 3 19.4802 3 19.908 3.21799C20.2843 3.40973 20.5903 3.71569 20.782 4.09202C21 4.51984 21 5.07989 21 6.2V17.8C21 18.9201 21 19.4802 20.782 19.908C20.5903 20.2843 20.2843 20.5903 19.908 20.782C19.4802 21 18.9201 21 17.8 21H6.2C5.07989 21 4.51984 21 4.09202 20.782C3.71569 20.5903 3.40973 20.2843 3.21799 19.908C3 19.4802 3 18.9201 3 17.8V6.2Z" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M15 18L7 18" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M17 14L7 14" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M17 10L7 10" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M17 6L7 6" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                    {i === 5 && (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 10V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H9" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M15 22V17M15 17L12 20M15 17L18 20" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M11 4V8" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M8 4V8" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M16 4V8" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round"/>
                                      </svg>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                            
                            {/* Inner orbit */}
                            <motion.div
                              className="absolute w-[130px] h-[130px] left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                              animate={{ rotate: -360 }}
                              transition={{
                                repeat: Infinity,
                                duration: 30,
                                ease: "linear"
                              }}
                            >
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 130 130" fill="none">
                                <ellipse cx="65" cy="65" rx="63" ry="40" transform="rotate(-15 65 65)" stroke="#e8e8e8" strokeWidth="1" strokeDasharray="1 3" />
                              </svg>
                              
                              {/* Inner orbiting elements - payment methods */}
                              {[25, 115, 205, 295].map((angle, i) => (
                                <motion.div
                                  key={i}
                                  className="absolute"
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    left: "50%",
                                    top: "50%",
                                    transform: `rotate(${angle}deg) translate(52px, 0) translate(-50%, -50%) rotate(-${angle}deg)`,
                                  }}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.5, delay: 0.8 + (0.15 * i) }}
                                >
                                  <div className="bg-white p-1 rounded-full shadow-sm border border-[#f0f0f0] flex items-center justify-center">
                                    {/* Payment method icons */}
                                    {i === 0 && (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20.6996 8.3999H3.2996C2.6996 8.3999 2.0996 7.7999 2.0996 7.1999V3.9999C2.0996 3.3999 2.6996 2.7999 3.2996 2.7999H20.6996C21.2996 2.7999 21.8996 3.3999 21.8996 3.9999V7.1999C21.8996 7.7999 21.2996 8.3999 20.6996 8.3999Z" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M20.6996 21.1999H3.2996C2.6996 21.1999 2.0996 20.5999 2.0996 19.9999V16.7999C2.0996 16.1999 2.6996 15.5999 3.2996 15.5999H20.6996C21.2996 15.5999 21.8996 16.1999 21.8996 16.7999V19.9999C21.8996 20.5999 21.2996 21.1999 20.6996 21.1999Z" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M6.5 12V15.6" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M17.5 8.3999V12.0999" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 8.3999V15.5999" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                    {i === 1 && (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7 15H12" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M7 11H16" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M7 7H16" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M17 20H7C5.89543 20 5 19.1046 5 18V6C5 4.89543 5.89543 4 7 4H12.5858C12.851 4 13.1054 4.10536 13.2929 4.29289L18.7071 9.70711C18.8946 9.89464 19 10.149 19 10.4142V18C19 19.1046 18.1046 20 17 20Z" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                    {i === 2 && (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M21 10H3" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M16.5 6H3" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M7.5 14H3" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M3 18H12" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                    {i === 3 && (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="#BCE704" strokeWidth="1.5"/>
                                        <path d="M12 17V12" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M12 7V8" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round"/>
                                      </svg>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                            
                            {/* Central globe with earth icon */}
                            <motion.div
                              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              transition={{ 
                                duration: 0.8,
                                ease: "easeOut"
                              }}
                            >
                              <motion.div
                                className="bg-white w-18 h-18 rounded-full shadow-lg border border-[#f5f5f5] p-4 flex items-center justify-center"
                                animate={{
                                  boxShadow: [
                                    "0 4px 12px rgba(0, 0, 0, 0.05)",
                                    "0 4px 15px rgba(188, 231, 4, 0.15)",
                                    "0 4px 12px rgba(0, 0, 0, 0.05)"
                                  ]
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 60,
                                    repeat: Infinity,
                                    ease: "linear"
                                  }}
                                >
                                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="9" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M18.2306 18.9151C16.5775 20.8673 14.2123 22 11.5806 22C8.94894 22 6.35576 20.2422 4.7027 18.9151" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M3.02246 8C4.66797 4.81764 7.81576 2.82432 11.3786 2.11826M20.9777 8C20.5842 7.17562 20.0669 6.41116 19.44 5.73071" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M3 12H21" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M12 3V21" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M10.5253 3.17053C7.98884 9.41105 7.98884 14.5889 10.5253 20.8295" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M13.4746 3.17053C16.0111 9.41105 16.0111 14.5889 13.4746 20.8295" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M19.0894 14.8888C12.8489 11.7112 7.14706 11.7112 3.05923 14.8888" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M19.0894 9.11122C12.8489 12.2888 7.14706 12.2888 3.05923 9.11122" stroke="#BCE704" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                </motion.div>
                              </motion.div>
                            </motion.div>
                            
                            {/* Data flow lines */}
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 250 250" opacity="0.7">
                              {/* Connection lines - animated data flow */}
                              {[45, 135, 225, 315].map((angle, i) => (
                                <motion.g key={i}>
                                  <motion.path
                                    d={`M125,125 L${125 + Math.cos(angle * Math.PI / 180) * 105},${125 + Math.sin(angle * Math.PI / 180) * 105}`}
                                    stroke="#BCE704"
                                    strokeWidth="1"
                                    strokeDasharray="3 5"
                                    strokeOpacity="0.6"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{
                                      duration: 2,
                                      delay: 0.5 + (i * 0.3),
                                      ease: "easeOut"
                                    }}
                                  />
                                  
                                  {/* Animated data dots */}
                                  <motion.circle 
                                    r="3" 
                                    fill="#BCE704" 
                                    initial={{ opacity: 0 }}
                                    animate={{ 
                                      opacity: [0, 0.8, 0],
                                      offsetDistance: ["0%", "100%"]
                                    }}
                                    transition={{
                                      duration: 3,
                                      repeat: Infinity,
                                      delay: 2.5 + (i * 0.5),
                                      repeatDelay: 4,
                                      ease: "easeInOut"
                                    }}
                                    style={{ offsetPath: `path('M125,125 L${125 + Math.cos(angle * Math.PI / 180) * 105},${125 + Math.sin(angle * Math.PI / 180) * 105}')` }}
                                  />
                                </motion.g>
                              ))}
                            </svg>
                          </div>
                        </motion.div>
                      </div>
                      
                      {/* Badge label */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <motion.div
                          className="bg-white px-5 py-2 rounded-full shadow-sm flex items-center space-x-2 border border-[#f0f0f8]"
                          initial={{ y: 20, opacity: 0 }}
                          whileInView={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 1.5 }}
                          viewport={{ once: true }}
                          whileHover={{ 
                            y: -2, 
                            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)",
                            transition: { duration: 0.2 }
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-[#BCE704]"></div>
                          <span className="font-medium text-sm text-gray-700 tracking-wide">Global access</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              {/* Secondary Features - 3 column cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                {/* Feature 1 - Payment Links */}
                <motion.div 
                  className="group rounded-2xl overflow-hidden bg-white border border-[#f5f5f5]"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={{ 
                    y: -4,
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.04)",
                    transition: { duration: 0.2 }
                  }}
                >
                  <div className="p-7">
                    <div className="flex items-center mb-5">
                      <motion.div
                        className="rounded-xl bg-[#fafafa] w-12 h-12 flex items-center justify-center mr-4 group-hover:bg-[#BCE704]/10 transition-colors duration-300"
                        whileHover={{ x: [0, 5, -5, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <LinkIcon className="h-5 w-5 text-[#BCE704]" />
                      </motion.div>
                      <div>
                        <h3 className="text-base font-['Poppins'] font-bold text-black">Payment Links</h3>
                        <p className="text-xs text-gray-500 font-light mt-0.5">
                          Share instantly
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Create custom payment links to share offers instantly on any messaging platform.
                    </p>
                  </div>
                </motion.div>
                
                {/* Feature 2 - P2P Made Simple */}
                <motion.div 
                  className="group rounded-2xl overflow-hidden bg-white border border-[#f5f5f5]"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={{ 
                    y: -4,
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.04)",
                    transition: { duration: 0.2 }
                  }}
                >
                  <div className="p-7">
                    <div className="flex items-center mb-5">
                      <motion.div
                        className="rounded-xl bg-[#fafafa] w-12 h-12 flex items-center justify-center mr-4 group-hover:bg-[#BCE704]/10 transition-colors duration-300"
                        animate={{
                          scale: [1, 1.05, 1]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Users className="h-5 w-5 text-[#BCE704]" />
                      </motion.div>
                      <div>
                        <h3 className="text-base font-['Poppins'] font-bold text-black">P2P Made Simple</h3>
                        <p className="text-xs text-gray-500 font-light mt-0.5">
                          Direct trading
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Trade directly with users worldwide with DeFi security and CEX-level ease of use.
                    </p>
                  </div>
                </motion.div>
                
                {/* Feature 3 - Rapid Settlement */}
                <motion.div 
                  className="group rounded-2xl overflow-hidden bg-white border border-[#f5f5f5]"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={{ 
                    y: -4,
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.04)",
                    transition: { duration: 0.2 }
                  }}
                >
                  <div className="p-7">
                    <div className="flex items-center mb-5">
                      <motion.div
                        className="rounded-xl bg-[#fafafa] w-12 h-12 flex items-center justify-center mr-4 group-hover:bg-[#BCE704]/10 transition-colors duration-300"
                        animate={{ rotate: [0, 360] }}
                        transition={{
                          duration: 6,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      >
                        <svg className="h-5 w-5 text-[#BCE704]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                          <path d="M12 8V12L14 14" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </motion.div>
                      <div>
                        <h3 className="text-base font-['Poppins'] font-bold text-black">Rapid Settlement</h3>
                        <p className="text-xs text-gray-500 font-light mt-0.5">
                          Instant transactions
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Complete transactions in seconds with Solana's high-speed blockchain infrastructure.
                    </p>
                  </div>
                </motion.div>
              </div>
              
              {/* Enhanced Call to Action Section */}
              <motion.div 
                className="mt-32 relative"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                {/* Section Title */}
                <motion.div 
                  className="text-center mb-16 relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                >
                  <motion.h3 
                    className="text-3xl font-['Poppins'] font-bold text-black mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    viewport={{ once: true }}
                  >
                    {t('landingPage.features.title')}
                  </motion.h3>
                  <motion.p
                    className="text-gray-500 max-w-xl mx-auto text-base"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                  >
                    {t('landingPage.features.subtitle')}
                  </motion.p>
                </motion.div>
                
                {/* Three Feature Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
                  {/* Feature 1 - Exchange */}
                  <motion.div 
                    className="group overflow-hidden rounded-3xl relative"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ 
                      y: -5,
                      transition: { duration: 0.3 }
                    }}
                  >
                    {/* Card with gradient background and hover effect */}
                    <div className="relative overflow-hidden h-[320px] rounded-3xl bg-gradient-to-b from-[#fafafa] to-white border border-[#f0f0f8] p-0.5">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#BCE704]/5 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Card content */}
                      <div className="relative z-10 h-full p-7 flex flex-col">
                        <div className="grow">
                          {/* Icon with floating animation */}
                          <motion.div 
                            className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-5 border border-[#f5f5f5]"
                            animate={{ 
                              y: [0, -5, 0],
                              rotate: [0, 2, 0]
                            }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[#BCE704]">
                              <path d="M7 10L12 14L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </motion.div>
                          
                          <h4 className="text-xl font-['Poppins'] font-bold text-black mb-3">{t('landingPage.features.exchangeTitle')}</h4>
                          <p className="text-gray-500 text-sm leading-relaxed">
                            {t('landingPage.features.exchangeDescription')}
                          </p>
                        </div>
                        
                        {/* Animated illustration */}
                        <div className="h-32 relative mt-4 mb-4 overflow-hidden">
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            animate={{ 
                              scale: [0.95, 1, 0.95] 
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <div className="relative">
                              <div className="w-[180px] h-[70px] bg-white rounded-lg shadow-sm border border-[#f5f5f5] flex items-center justify-between px-4">
                                <div className="flex flex-col items-start">
                                  <div className="text-xs text-gray-400 mb-1">You pay</div>
                                  <div className="text-sm font-semibold">100 USD</div>
                                </div>
                                <div className="h-8 w-px bg-[#f0f0f8]"></div>
                                <div className="flex flex-col items-end">
                                  <div className="text-xs text-gray-400 mb-1">You get</div>
                                  <div className="text-sm font-semibold text-[#BCE704]">0.0034 SOL</div>
                                </div>
                              </div>
                              
                              <motion.div 
                                className="absolute -bottom-3 inset-x-0 flex justify-center"
                                animate={{ 
                                  y: [0, -4, 0]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: 0.5
                                }}
                              >
                                <div className="h-6 w-12 bg-[#BCE704] rounded-full flex items-center justify-center shadow-md">
                                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </motion.div>
                            </div>
                          </motion.div>
                        </div>
                        
                        {/* CTA Button */}
                        <motion.button
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="w-full py-3 bg-[#f9f9f9] hover:bg-[#BCE704]/10 text-black font-['Poppins'] font-medium text-sm rounded-xl transition-colors duration-300 mt-auto border border-[#f0f0f8] group-hover:border-[#BCE704]/30"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {t('landingPage.features.startExchangeButton')}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Feature 2 - Marketplace */}
                  <motion.div 
                    className="group overflow-hidden rounded-3xl relative"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.2 }}
                    viewport={{ once: true }}
                    whileHover={{ 
                      y: -5,
                      transition: { duration: 0.3 }
                    }}
                  >
                    {/* Card with gradient background and hover effect */}
                    <div className="relative overflow-hidden h-[320px] rounded-3xl bg-gradient-to-b from-[#fafafa] to-white border border-[#f0f0f8] p-0.5">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#BCE704]/5 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Card content */}
                      <div className="relative z-10 h-full p-7 flex flex-col">
                        <div className="grow">
                          {/* Icon with floating animation */}
                          <motion.div 
                            className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-5 border border-[#f5f5f5]"
                            animate={{ 
                              y: [0, -5, 0],
                              rotate: [0, -2, 0]
                            }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.5
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[#BCE704]">
                              <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <circle cx="7" cy="6" r="2" fill="currentColor"/>
                              <circle cx="14" cy="12" r="2" fill="currentColor"/>
                              <circle cx="10" cy="18" r="2" fill="currentColor"/>
                            </svg>
                          </motion.div>
                          
                          <h4 className="text-xl font-['Poppins'] font-bold text-black mb-3">{t('landingPage.features.marketplaceTitle')}</h4>
                          <p className="text-gray-500 text-sm leading-relaxed">
                            {t('landingPage.features.marketplaceDescription')}
                          </p>
                        </div>
                        
                        {/* Animated illustration */}
                        <div className="h-32 relative mt-4 mb-4 overflow-hidden">
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <div className="relative flex items-center justify-center space-x-2">
                              {/* Offer cards that slide in */}
                              <motion.div 
                                className="w-24 h-[75px] bg-white rounded-lg shadow-sm border border-[#f5f5f5] p-2 flex flex-col justify-between relative"
                                initial={{ x: -100, opacity: 0, rotateY: 40 }}
                                animate={{ x: 0, opacity: 1, rotateY: 0 }}
                                transition={{
                                  type: "spring", 
                                  stiffness: 100,
                                  damping: 20,
                                  delay: 0.5
                                }}
                              >
                                <div className="text-xs font-semibold">Buy SOL</div>
                                <div className="text-[9px] text-gray-500">with Zelle</div>
                                <div className="flex justify-between items-center">
                                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                                  <div className="text-[10px] font-bold text-black">$24.81</div>
                                </div>
                                <div className="absolute -right-1 -top-1 w-3 h-3 bg-[#BCE704]/20 rounded-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-[#BCE704] rounded-full"></div>
                                </div>
                              </motion.div>
                              
                              <motion.div 
                                className="w-24 h-[75px] bg-white rounded-lg shadow-sm border border-[#f5f5f5] p-2 flex flex-col justify-between z-10 relative"
                                initial={{ y: 60, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{
                                  type: "spring", 
                                  stiffness: 100,
                                  damping: 20,
                                  delay: 0.7
                                }}
                              >
                                <div className="text-xs font-semibold">Sell SOL</div>
                                <div className="text-[9px] text-gray-500">with Bank Transfer</div>
                                <div className="flex justify-between items-center">
                                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                                  <div className="text-[10px] font-bold text-black">$25.02</div>
                                </div>
                                <div className="absolute -right-1 -top-1 w-3 h-3 bg-[#BCE704]/20 rounded-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-[#BCE704] rounded-full"></div>
                                </div>
                              </motion.div>
                              
                              <motion.div 
                                className="w-24 h-[75px] bg-white rounded-lg shadow-sm border border-[#f5f5f5] p-2 flex flex-col justify-between relative"
                                initial={{ x: 100, opacity: 0, rotateY: -40 }}
                                animate={{ x: 0, opacity: 1, rotateY: 0 }}
                                transition={{
                                  type: "spring", 
                                  stiffness: 100,
                                  damping: 20,
                                  delay: 0.9
                                }}
                              >
                                <div className="text-xs font-semibold">Buy BTC</div>
                                <div className="text-[9px] text-gray-500">with Cash App</div>
                                <div className="flex justify-between items-center">
                                  <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                                  <div className="text-[10px] font-bold text-black">$31,453</div>
                                </div>
                                <div className="absolute -right-1 -top-1 w-3 h-3 bg-[#BCE704]/20 rounded-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-[#BCE704] rounded-full"></div>
                                </div>
                              </motion.div>
                            </div>
                          </motion.div>
                        </div>
                        
                        {/* CTA Button */}
                        <motion.button
                          onClick={() => window.location.href = '/marketplace'}
                          className="w-full py-3 bg-[#f9f9f9] hover:bg-[#BCE704]/10 text-black font-['Poppins'] font-medium text-sm rounded-xl transition-colors duration-300 mt-auto border border-[#f0f0f8] group-hover:border-[#BCE704]/30"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {t('landingPage.features.visitMarketplaceButton')}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Feature 3 - Create Offer */}
                  <motion.div 
                    className="group overflow-hidden rounded-3xl relative"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.3 }}
                    viewport={{ once: true }}
                    whileHover={{ 
                      y: -5,
                      transition: { duration: 0.3 }
                    }}
                  >
                    {/* Card with gradient background and hover effect */}
                    <div className="relative overflow-hidden h-[320px] rounded-3xl bg-gradient-to-b from-[#fafafa] to-white border border-[#f0f0f8] p-0.5">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#BCE704]/5 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Card content */}
                      <div className="relative z-10 h-full p-7 flex flex-col">
                        <div className="grow">
                          {/* Icon with floating animation */}
                          <motion.div 
                            className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-5 border border-[#f5f5f5]"
                            animate={{ 
                              y: [0, -5, 0],
                              rotate: [0, 3, 0]
                            }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[#BCE704]">
                              <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </motion.div>
                          
                          <h4 className="text-xl font-['Poppins'] font-bold text-black mb-3">{t('landingPage.features.createOfferTitle')}</h4>
                          <p className="text-gray-500 text-sm leading-relaxed">
                            {t('landingPage.features.createOfferDescription')}
                          </p>
                        </div>
                        
                        {/* Animated illustration */}
                        <div className="h-32 relative mt-4 mb-4 overflow-hidden">
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            animate={{ 
                              y: [2, -2, 2] 
                            }}
                            transition={{
                              duration: 3.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <div className="relative">
                              <div className="w-48 h-auto bg-white rounded-lg shadow-sm border border-[#f5f5f5] p-3">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="text-xs font-semibold">New Offer</div>
                                  <div className="w-4 h-4 bg-[#BCE704]/20 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-[#BCE704] rounded-full"></div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <div className="text-[10px] text-gray-500">Amount</div>
                                    <div className="text-[10px] font-medium">1,000 USD</div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <div className="text-[10px] text-gray-500">Asset</div>
                                    <div className="text-[10px] font-medium">SOL</div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <div className="text-[10px] text-gray-500">Price</div>
                                    <div className="text-[10px] font-medium">25.20 USD</div>
                                  </div>
                                </div>
                                
                                <motion.div 
                                  className="mt-3 h-5 bg-[#BCE704] rounded-md flex items-center justify-center"
                                  initial={{ width: 0 }}
                                  animate={{ width: "100%" }}
                                  transition={{
                                    duration: 1.5,
                                    ease: "easeInOut",
                                    delay: 1.2,
                                    repeat: Infinity,
                                    repeatDelay: 2
                                  }}
                                >
                                  <div className="text-[10px] text-black font-medium">{t('landingPage.features.createOfferButtonLabel')}</div>
                                </motion.div>
                              </div>
                              
                              {/* Small decoration elements */}
                              <motion.div 
                                className="absolute -bottom-3 -right-3 w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center border border-[#f5f5f5]"
                                animate={{ 
                                  scale: [1, 1.2, 1],
                                  opacity: [0.7, 1, 0.7]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: 0.5
                                }}
                              >
                                <svg className="w-3 h-3 text-[#BCE704]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </motion.div>
                              
                              <motion.div 
                                className="absolute -top-3 -left-3 w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center border border-[#f5f5f5]"
                                animate={{ 
                                  scale: [1, 1.2, 1],
                                  opacity: [0.7, 1, 0.7]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: 1
                                }}
                              >
                                <svg className="w-3 h-3 text-[#BCE704]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                                </svg>
                              </motion.div>
                            </div>
                          </motion.div>
                        </div>
                        
                        {/* CTA Button */}
                        <motion.button
                          onClick={() => window.location.href = '/maker'}
                          className="w-full py-3 bg-[#f9f9f9] hover:bg-[#BCE704]/10 text-black font-['Poppins'] font-medium text-sm rounded-xl transition-colors duration-300 mt-auto border border-[#f0f0f8] group-hover:border-[#BCE704]/30"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {t('landingPage.features.createNewOfferButton')}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Main CTA Button */}
                <motion.div 
                  className="text-center relative"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  {/* Subtle background elements */}
                  <motion.div 
                    className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                  >
                    <svg width="100%" height="100%" viewBox="0 0 100 100" className="opacity-5">
                      <circle cx="50" cy="50" r="48" stroke="#BCE704" strokeWidth="1" fill="none" strokeDasharray="3 3" />
                      <circle cx="50" cy="50" r="30" stroke="#BCE704" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                    </svg>
                  </motion.div>
                  
                  <motion.button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="relative px-10 py-4 bg-[#BCE704] text-black font-['Poppins'] font-bold text-base rounded-full shadow-lg shadow-[#BCE704]/10 hover:shadow-xl hover:shadow-[#BCE704]/20 transition-all"
                    whileHover={{ 
                      scale: 1.05,
                      y: -3,
                      boxShadow: "0 15px 30px rgba(188, 231, 4, 0.2)"
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.span 
                      className="relative inline-flex items-center"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        repeatType: "reverse", 
                        ease: "easeInOut",
                        repeatDelay: 1
                      }}
                    >
                      {t('landingPage.features.startTradingButton')} 
                      <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </motion.span>
                  </motion.button>
                  
                  <p className="mt-4 text-gray-400 text-sm">{t('landingPage.features.securityNote')}</p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}