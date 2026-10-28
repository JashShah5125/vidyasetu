import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Calendar,
  CreditCard,
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  Check,
  ChevronDown,
  X,
  Sliders,
  Server,
  FolderTree,
  AlertTriangle,
  GitBranch,
  BarChart3,
  FileCheck2,
  Cpu,
  TrendingUp,
  Award,
  PieChart,
  Lock,
  CheckSquare,
  FileText,
  HelpCircle,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// --- DATA STRUCTURES & DEFINITIONS ---

interface MvpFeature {
  id: 'multitenant' | 'masters' | 'crm' | 'scheduler';
  badge: string;
  title: string;
  tabName: string;
  tagline: string;
  description: string;
  highlights: string[];
  metrics: { label: string; value: string; trend: string };
}

const MVP_FEATURES: MvpFeature[] = [
  {
    id: 'multitenant',
    badge: 'STEP 1 • PRIVATE & EASY ONBOARDING',
    title: 'Your Private Institute Portal, Ready in Minutes',
    tabName: 'Private Setup & Branches',
    tagline: '100% confidential student data with fast branch expansion.',
    description: 'Private branded workspace for your academy. All student records, marks, and fees stay 100% confidential.',
    highlights: [
      '100% Confidential Records',
      'Multi-Branch Management',
      'Quick 10-Minute Setup'
    ],
    metrics: { label: 'Data Privacy', value: '100% Confidential', trend: 'Protected' }
  },
  {
    id: 'masters',
    badge: 'STEP 2 • ACADEMY STRUCTURE & SETUP',
    title: 'Organize Your Branches, Batches & Courses',
    tabName: 'Structure & Batches',
    tagline: 'Set up classrooms, subjects, teachers, and timings.',
    description: 'Structure your academy in minutes. Add classroom seating limits, link subjects, and create batch schedules.',
    highlights: [
      'Classroom Capacity Limits',
      'Morning & Evening Shifts',
      'Course & Exam Syllabus'
    ],
    metrics: { label: 'Setup Time', value: '< 15 Mins', trend: 'No IT Required' }
  },
  {
    id: 'crm',
    badge: 'STEP 3 • STUDENT ADMISSIONS & CRM',
    title: 'Turn Inquiries into Paid Admissions Faster',
    tabName: 'Admissions & Inquiries',
    tagline: 'Capture inquiries and enroll students in 1 click.',
    description: 'Track inquiries from first call to admission. Schedule trial classes, send WhatsApp brochures, and enroll in 1 click.',
    highlights: [
      'Visual Inquiry Pipeline',
      '1-Click Student Enrollment',
      'Automated WhatsApp & SMS'
    ],
    metrics: { label: 'Conversion', value: '1-Click Admission', trend: 'Zero Lost Inquiries' }
  },
  {
    id: 'scheduler',
    badge: 'STEP 4 • SMART TIMETABLE & ATTENDANCE',
    title: 'Clash-Free Timetables & Daily Attendance',
    tabName: 'Timetable & Attendance',
    tagline: 'Zero double-booking and 10-second mobile attendance.',
    description: 'Automatic clash detection for faculty and rooms. Quick teacher swaps and instant absent SMS to parents.',
    highlights: [
      'Zero Schedule Clashes',
      '1-Click Teacher Swap',
      'Mobile Attendance with SMS'
    ],
    metrics: { label: 'Accuracy', value: '100% Clash-Free', trend: 'Saves 10h/Week' }
  }
];

const ROLES_SHOWCASE = [
  {
    id: 'inst-admin',
    title: 'Institute Director & Owner',
    icon: Building2,
    badge: 'Owner HQ',
    description: 'Complete visibility over all your branches, student admissions, fee collections, and staff from a single master dashboard.',
    features: [
      'All-Branch Overview: See total admissions, active students, and fee collections across every branch in real time',
      'Financial Control: Track overall fee income, pending student dues, staff salaries, and net profits',
      'Staff & Teacher Roles: Control staff logins, assign branch responsibilities, and set custom permissions',
      'Academy Expansion: Add new branch locations, launch new courses, and monitor overall institute performance'
    ]
  },
  {
    id: 'branch-admin',
    title: 'Branch Manager',
    icon: Layers,
    badge: 'Branch Operations',
    description: 'Run your local branch smoothly every day — manage local classrooms, student batches, teacher schedules, and daily admissions.',
    features: [
      'Local Branch Hub: Monitor your branch students, faculty attendance, and active lecture schedules',
      'Daily Timetable Execution: Ensure lectures start on time and handle emergency teacher substitutions smoothly',
      'Classroom Seating Control: Check room capacity and assign lecture halls without overcrowding',
      'Branch Counter Admissions: Oversee local student walk-ins, inquiries, and daily counter fee collections'
    ]
  },
  {
    id: 'counsellor',
    title: 'Admissions Counselor',
    icon: Users,
    badge: 'Inquiries & CRM',
    description: 'Capture new student inquiries, book demo classes, schedule parent follow-up calls, and close admissions in 1 click.',
    features: [
      'Visual Inquiry Pipeline: Track leads easily through simple stages: Inquiry ➔ Demo ➔ Follow-up ➔ Enrolled',
      '1-Click Student Enrollment: Convert interested candidates into enrolled students with automatic roll number generation',
      'Scheduled Call Reminders: Get daily follow-up task alerts so no parent or inquiry is ever forgotten',
      'WhatsApp Brochures & Demo Booking: Send course fee brochures and trial class confirmations directly to parents'
    ]
  },
  {
    id: 'teacher',
    title: 'Faculty / Teacher',
    icon: GraduationCap,
    badge: 'Teaching & Classes',
    description: 'Everything teachers need without paperwork — check daily class timetables, mark student attendance on mobile, and post homework.',
    features: [
      'Personal Lecture Schedule: View daily and weekly class slots with room numbers on your phone or laptop',
      '10-Second Attendance: Punch lecture attendance digitally; parents receive instant SMS alerts if a student is absent',
      'Homework & Assignments: Upload homework, set submission deadlines, and grade student work digitally',
      'Student Doubt Desk: Answer student academic questions and track individual batch progress easily'
    ]
  },
  {
    id: 'finance',
    title: 'Accountant / Finance Desk',
    icon: CreditCard,
    badge: 'Fees & Accounts',
    description: 'Manage all student fee installments, send WhatsApp payment reminders, generate receipts, and track staff salaries.',
    features: [
      'Installments & Fee Plans: Set up flexible fee payment dates, token advance, and scholarship discounts',
      'WhatsApp Defaulter Reminders: Find overdue fee payments in seconds and send 1-click WhatsApp reminders to parents',
      'Instant Digital Receipts: Generate GST-compliant, printable payment receipts automatically upon fee collection',
      'Salaries & Daily Expenses: Log staff salary payouts, petty cash expenses, and view clear daily cash flow reports'
    ]
  }
];

const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Starter Academy',
    badge: 'Single Campus',
    description: 'Perfect for boutique coaching centers and growing single-location tuition institutes.',
    monthlyPrice: 3499,
    annualPrice: 2799,
    features: [
      '1 Physical Campus Branch',
      'Up to 300 Enrolled Students',
      'Full Admissions & CRM Funnel',
      'Conflict-Free Timetable Scheduler',
      'Fee Collection & Receipts Generator',
      'Faculty Dashboard & Attendance',
      'Email & In-App Alerts',
      'Standard 24/7 Knowledge Support'
    ],
    popular: false,
    cta: 'Start 14-Day Free Trial'
  },
  {
    id: 'growth',
    name: 'Growth Multi-Branch',
    badge: 'Most Popular',
    description: 'Engineered for scaling academies managing 2 to 4 branches with expanding student batches.',
    monthlyPrice: 6999,
    annualPrice: 5599,
    features: [
      'Up to 4 Branch Locations',
      'Up to 1,500 Enrolled Students',
      'Everything in Starter, plus:',
      'WhatsApp Automation (Absent Alerts & Fee Reminders)',
      'Expense Ledger & Voucher Management',
      'Student Doubts Resolution Hub',
      'Parent Communication Portal',
      'Role-Based Staff Permissions (RBAC)',
      'Priority Phone & Chat Support'
    ],
    popular: true,
    cta: 'Start 14-Day Free Trial'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Network',
    badge: 'State & National Networks',
    description: 'For premier coaching brands requiring custom domains, limitless campuses, and dedicated infrastructure.',
    monthlyPrice: 14999,
    annualPrice: 11999,
    features: [
      'Unlimited Branch Campuses',
      'Unlimited Student Intake',
      'Custom Branded Subdomain / White-label',
      'Biometric Machine API Integration',
      'Custom Payment Gateway Connectors',
      'Dedicated Customer Success Manager',
      'Custom Report Builder & Export APIs',
      '99.9% Uptime Guarantee SLA'
    ],
    popular: false,
    cta: 'Contact Enterprise Team'
  }
];

const FAQS = [
  {
    q: 'How does VidyaSetu handle multiple physical branches for an institute?',
    a: 'VidyaSetu is built from the ground up as a multi-branch multi-tenant architecture. The Institute Owner can supervise all branches from a single unified HQ dashboard, while Branch Managers and staff only see data for their specific campus. Faculty members can be assigned across multiple branches with automated cross-branch schedule conflict prevention.'
  },
  {
    q: 'Can we migrate our existing student and fee data from Excel or another software?',
    a: 'Yes, absolutely. VidyaSetu features built-in Excel/CSV bulk import tools for Students, Staff, Subjects, Classrooms, and Fee structures with automated schema validation and column mapping. Our onboarding team also provides free assisted data migration for all Growth and Enterprise plans.'
  },
  {
    q: 'How does the automated WhatsApp alert system work?',
    a: 'VidyaSetu integrates with official WhatsApp Business Cloud APIs. When a teacher marks a student absent during attendance, or when a fee installment date approaches, personalized branded messages are automatically dispatched to the parents’ registered WhatsApp number with payment links or attendance summaries.'
  },
  {
    q: 'Is student and financial data completely private between institutes?',
    a: 'Yes. VidyaSetu implements strict tenant-scoping at the database query level. Every record is bound to a unique tenant identifier with cryptographic token verification. No tenant can ever view, query, or leak data into another institute’s instance.'
  },
  {
    q: 'What hardware or installations are required to run VidyaSetu?',
    a: 'Zero installations required. VidyaSetu is 100% cloud-based and runs on any standard web browser on Windows, Mac, iPad, Android tablets, and mobile phones. All software updates, daily automated backups, and server maintenance are managed continuously in the cloud.'
  },
  {
    q: 'Can teachers use the platform on mobile phones to take attendance?',
    a: 'Yes! The Teacher Cockpit is fully responsive. Teachers can open the schedule on their phone or tablet in the classroom, mark attendance in under 30 seconds with quick taps, and instantly sync it with the branch office.'
  }
];

const NAV_LINKS = [
  { id: 'why-vidyasetu', label: 'Why VidyaSetu' },
  { id: 'mvps', label: 'Core MVPs' },
  { id: 'roles', label: 'Role Portals' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Interactive UI States
  const [activeMvp, setActiveMvp] = useState<'multitenant' | 'masters' | 'crm' | 'scheduler' | null>('multitenant');
  const [activeRole, setActiveRole] = useState<string>('inst-admin');
  const [isAnnual, setIsAnnual] = useState<boolean>(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [demoFormData, setDemoFormData] = useState({
    name: '',
    instituteName: '',
    phone: '',
    email: '',
    studentCount: '250-500'
  });
  const [demoSubmitted, setDemoSubmitted] = useState<boolean>(false);

  // Anonymized Interactive Controls:
  const [mvp1Tab, setMvp1Tab] = useState<'isolation' | 'quotas' | 'onboarding'>('isolation');
  const [mvp2Level, setMvp2Level] = useState<'campuses' | 'programs' | 'batches' | 'facilities'>('programs');
  const [mvp3FunnelStage, setMvp3FunnelStage] = useState<'leads' | 'demo' | 'eval' | 'enrolled'>('leads');
  const [simConflictState, setSimConflictState] = useState<boolean>(false);
  const [activeComparisonCard, setActiveComparisonCard] = useState<'legacy' | 'solution' | null>(null);

  const [activeNavSection, setActiveNavSection] = useState<string>('why-vidyasetu');

  // Smooth sliding pill indicator measurements
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({});
  const [pillIndicator, setPillIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false
  });

  const updatePillPosition = () => {
    const activeEl = linkRefs.current[activeNavSection];
    const container = navContainerRef.current;
    if (activeEl && container) {
      const activeRect = activeEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setPillIndicator({
        left: activeRect.left - containerRect.left,
        width: activeRect.width,
        ready: true
      });
    }
  };

  useEffect(() => {
    updatePillPosition();
    window.addEventListener('resize', updatePillPosition);
    return () => window.removeEventListener('resize', updatePillPosition);
  }, [activeNavSection]);

  // Scroll to top when clicking VidyaSetu brand logo
  const handleScrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveNavSection('why-vidyasetu');
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState(null, '', '/');
  };

  // Smooth programmatic scroll handler
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setActiveNavSection(id);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.history.pushState(null, '', `#${id}`);
  };

  const handleMobileNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setActiveNavSection(id);
    setMobileMenuOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.history.pushState(null, '', `#${id}`);
  };

  // Sync active nav section with URL hash and scrolling
  useEffect(() => {
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && ['why-vidyasetu', 'mvps', 'roles', 'architecture', 'pricing', 'faq'].includes(initialHash)) {
      setActiveNavSection(initialHash);
    } else {
      window.scrollTo(0, 0);
    }

    const handleHashChange = () => {
      const currentHash = window.location.hash.replace('#', '');
      if (currentHash && ['why-vidyasetu', 'mvps', 'roles', 'architecture', 'pricing', 'faq'].includes(currentHash)) {
        setActiveNavSection(currentHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    const sectionIds = ['why-vidyasetu', 'mvps', 'roles', 'architecture', 'pricing', 'faq'];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible && visible.target.id) {
          setActiveNavSection(visible.target.id);
        }
      },
      {
        threshold: 0.15,
        rootMargin: '-80px 0px -40% 0px'
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      observer.disconnect();
    };
  }, []);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setTimeout(() => {
        setIsDemoModalOpen(false);
        setDemoSubmitted(false);
      }, 2500);
    }, 500);
  };

  const selectedMvp = MVP_FEATURES.find((m) => m.id === activeMvp) || MVP_FEATURES[0];
  const selectedRoleData = ROLES_SHOWCASE.find((r) => r.id === activeRole) || ROLES_SHOWCASE[0];

  return (
    <div
      ref={mainContainerRef}
      className="fixed inset-0 overflow-y-auto overflow-x-hidden scroll-smooth bg-[#F8FAFC] text-slate-800 selection:bg-blue-600 selection:text-white font-sans antialiased"
    >
      {/* ── CRISP LIGHT ATMOSPHERIC ACCENTS ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-100/60 via-indigo-50/40 to-transparent rounded-full blur-[120px] opacity-80" />
        <div className="absolute top-[25%] -left-[160px] w-[500px] h-[500px] bg-sky-100/60 rounded-full blur-[140px] opacity-70" />
        <div className="absolute top-[50%] -right-[160px] w-[600px] h-[600px] bg-blue-50/70 rounded-full blur-[160px] opacity-70" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* ── FLOATING GRADIENT GLASS PILL NAVBAR (Landing Page Color Scheme) ── */}
      <header className="sticky top-4 z-40 px-4 sm:px-6 max-w-5xl mx-auto">
        <nav className="relative bg-gradient-to-r from-blue-700/90 via-blue-600/85 to-indigo-600/90 backdrop-blur-2xl border border-white/25 rounded-full px-3.5 sm:px-4 py-2 flex items-center justify-between shadow-[0_12px_36px_rgba(37,99,235,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] ring-1 ring-white/10 transition-all duration-300">
          {/* Brand Logo & Name (Click to Scroll to Top) */}
          <Link
            to="/"
            onClick={handleScrollToTop}
            className="flex items-center gap-2.5 group shrink-0 pl-1 cursor-pointer"
            title="Scroll to top"
          >
            <div className="w-7 h-7 rounded-full bg-white p-1 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
              <img src="/logo.png" alt="VidyaSetu" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white group-hover:text-blue-100 transition-colors">
              VidyaSetu
            </span>
          </Link>

          {/* Navigation Links (Desktop with Liquid Smooth Sliding Pill) */}
          <div ref={navContainerRef} className="relative hidden lg:flex items-center gap-1 p-0.5">
            {/* Sliding Pill Indicator */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 h-8 bg-white/20 backdrop-blur-md border border-white/25 rounded-full shadow-inner pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                pillIndicator.ready ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                left: `${pillIndicator.left}px`,
                width: `${pillIndicator.width}px`
              }}
            />

            {NAV_LINKS.map((item) => {
              const isActive = activeNavSection === item.id;
              return (
                <a
                  key={item.id}
                  ref={(el) => {
                    linkRefs.current[item.id] = el;
                  }}
                  href={`#${item.id}`}
                  onClick={(e) => handleNavClick(e, item.id)}
                  className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs select-none transition-colors duration-250 ease-out ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-white/80 hover:text-white font-medium'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          {/* Right Action Controls (White Pill CTA) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {currentUser ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="group inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-slate-50 text-blue-700 hover:text-blue-800 text-xs font-bold shadow-md shadow-blue-950/20 transition-all active:scale-[0.98]"
              >
                <span>Dashboard</span>
                <ArrowRight size={13} className="text-blue-700 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-medium text-white/90 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register-institute"
                  className="px-5 py-2 rounded-full bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 font-bold text-xs tracking-wide shadow-md shadow-blue-950/20 hover:shadow-lg hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-1.5"
                >
                  <span>Register Institute</span>
                </Link>
              </>
            )}

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu (Gradient Glass) */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 p-3 bg-gradient-to-b from-blue-900/95 via-indigo-900/95 to-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
            {NAV_LINKS.map((item) => {
              const isActive = activeNavSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleMobileNavClick(e, item.id)}
                  className={`block px-3.5 py-2 rounded-xl text-xs transition-all duration-200 ${
                    isActive
                      ? 'font-bold text-white bg-white/20 border border-white/10 shadow-inner'
                      : 'font-medium text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <div className="pt-2 border-t border-white/15 flex items-center justify-between px-1">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-medium text-white/90 hover:text-white px-2 py-1"
              >
                Sign In
              </Link>
              <Link
                to="/register-institute"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-1.5 rounded-full bg-white text-blue-700 hover:text-blue-800 text-xs font-bold shadow-md"
              >
                Register Institute
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION (Light, Clean, Focused, Investor-Grade) ── */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto text-center">
        {/* Eyebrow Micro-pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/90 border border-blue-200 text-blue-700 text-[11px] font-bold tracking-wide uppercase mb-6 shadow-sm">
          <Award size={13} className="text-blue-600" />
          <span>Multi-Branch Education ERP & CRM</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-600 font-medium">Built for Academies</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-5xl mx-auto leading-[1.12]">
          Run Your Entire Coaching Academy on{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
            One Seamless Platform
          </span>
        </h1>

        {/* Hero Description */}
        <p className="mt-6 sm:mt-8 text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
          Eliminate timetable conflicts, stop losing walk-in admission leads, and automate fee collection reminders.
          VidyaSetu unites admissions, academics, faculty scheduling, and finance across all your campuses in real time.
        </p>

        {/* Hero Action CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register-institute"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98]"
          >
            <span>Register Your Institute Free</span>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight size={13} />
            </div>
          </Link>

          <button
            onClick={() => setIsDemoModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-sm font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Clock size={16} className="text-blue-600" />
            <span>Book Live 1-on-1 Walkthrough</span>
          </button>
        </div>

        {/* Metric Badges Strip (Defensible Software Guarantees & Capabilities) */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">100%</div>
            <div className="text-xs text-slate-500 font-semibold">Tenant Data Scoping Guarantee</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">&lt; 15 Mins</div>
            <div className="text-xs text-slate-500 font-semibold">Multi-Branch Institute Onboarding</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">1-Click</div>
            <div className="text-xs text-slate-500 font-semibold">Inquiry to Batch Allocation</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Zero</div>
            <div className="text-xs text-slate-500 font-semibold">Timetable & Room Overlaps</div>
          </div>
        </div>

        {/* Market Trust Strip */}
        <div className="mt-8 pt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Engineered For:</span>
          <span className="text-slate-600">JEE & NEET Coaching Networks</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">K-12 Tuition Chains</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">Commerce & CA Academies</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">Test-Prep Institutes</span>
        </div>
      </section>

      {/* ── THE MARKET THESIS: THE BROKEN LEGACY STACK VS VIDYASETU (scroll-mt-28) ── */}
      <section id="why-vidyasetu" className="relative z-10 py-20 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/80 scroll-mt-28">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold tracking-wider uppercase">
            <span>The Strategic Upgrade</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Why Coaching Academies Are Switching to VidyaSetu
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Coaching academies face 3 chronic operational bottlenecks:
            untracked counselor WhatsApp drop-offs, lecture room clash chaos, and unrecovered fee installment defaulters.
          </p>
        </div>

        {/* Side-by-Side Comparison Bento */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left: The Fragmented Legacy Status Quo */}
          <div
            onClick={() => setActiveComparisonCard(activeComparisonCard === 'legacy' ? null : 'legacy')}
            className={`p-6 sm:p-8 rounded-3xl space-y-6 flex flex-col justify-between relative overflow-hidden cursor-pointer select-none transition-all duration-300 ${
              activeComparisonCard === 'legacy'
                ? 'bg-rose-50/90 border-2 border-rose-500 shadow-xl shadow-rose-500/10 ring-4 ring-rose-500/20 scale-[1.01]'
                : 'bg-white/80 border border-slate-200/90 hover:border-rose-300 hover:bg-rose-50/30 hover:shadow-md'
            }`}
          >
            {activeComparisonCard === 'legacy' && (
              <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
                The Current Bottleneck
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle size={16} />
                <span>The Fragmented Status Quo (Legacy Stack)</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                5+ Disconnected Tools Costing You Time & Money
              </h3>

              <div className="space-y-3 pt-2 text-xs text-slate-700">
                <div className="p-3.5 rounded-2xl bg-white border border-rose-100 space-y-1">
                  <div className="font-bold text-rose-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Scattered Inquiries in Personal WhatsApps</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Over 40% of prospective student walk-in inquiries slip through the cracks because counsellors keep notes in personal phone chats.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-rose-100 space-y-1">
                  <div className="font-bold text-rose-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Weekly Timetable Clashes & Chaos</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Faculty scheduled across two branches at once, double-booked classrooms, and last-minute emergency cancellation complaints from parents.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-rose-100 space-y-1">
                  <div className="font-bold text-rose-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Unrecovered Fee Installments & Bad Debts</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Manual paper receipts and awkward phone follow-ups lead to delayed fee collections and uncollected student balances every semester.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-rose-100 space-y-1">
                  <div className="font-bold text-rose-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>No Real-Time Executive Visibility</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Institute owners spend weekends compiling Google Sheets from different branch managers to understand real cash flow and occupancy.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-100/70 border border-rose-200 text-xs text-rose-900 font-semibold flex items-center justify-between">
              <span>Operational Drag: Lost walk-in inquiries, delayed collections & schedule conflicts.</span>
              <span className="text-rose-700 font-black">High Overhead</span>
            </div>
          </div>

          {/* Right: The VidyaSetu Operating System */}
          <div
            onClick={() => setActiveComparisonCard(activeComparisonCard === 'solution' ? null : 'solution')}
            className={`p-6 sm:p-8 rounded-3xl space-y-6 flex flex-col justify-between relative overflow-hidden cursor-pointer select-none transition-all duration-300 ${
              activeComparisonCard === 'solution'
                ? 'bg-blue-50/90 border-2 border-blue-600 shadow-xl shadow-blue-600/10 ring-4 ring-blue-500/20 scale-[1.01]'
                : 'bg-white/80 border border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-md'
            }`}
          >
            {activeComparisonCard === 'solution' && (
              <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
                The Modern Solution
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                <Sparkles size={16} />
                <span>The VidyaSetu Unified Operating System</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                1 Platform to Scale Admissions, Academics & Finance
              </h3>

              <div className="space-y-3 pt-2 text-xs text-slate-700">
                <div className="p-3.5 rounded-2xl bg-white border border-blue-100 shadow-sm space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Visual Kanban CRM & 1-Click Enrollment</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Inquiries auto-captured, assigned to counsellors, and converted in 1 click with instant Roll Number, Batch assignment, and parent portal credentials.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-blue-100 shadow-sm space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Constraint-Aware Timetable Matrix</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Zero faculty overlaps, zero room double-bookings, and 1-click emergency substitution with automated SMS alerts sent to backup faculty.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-blue-100 shadow-sm space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Automated WhatsApp Fee Collection Reminders</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Smart payment milestone reminders sent to parents' WhatsApp with instant UPI payment links, automated digital receipts, and ledger closing.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-blue-100 shadow-sm space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Multi-Branch Director HQ Console</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Live cross-branch cash flow, student retention indexes, faculty workload analysis, and branch manager audits in a single executive cockpit.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-600 text-white text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-sm">
              <span>Operational Outcome: Zero timetable clashes, zero lost admission leads, and automated fee reconciliation.</span>
              <span className="text-blue-100 font-extrabold shrink-0">Zero Friction</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE MVPS SECTION (With scroll-mt-28 to prevent navbar clipping) ── */}
      <section id="mvps" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/80 scroll-mt-28">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold tracking-wider uppercase">
            <span>Core Deliverables</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            The 4 Core MVP Engines of VidyaSetu
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Engineered specifically to solve the foundational bottlenecks of modern coaching academies and educational institutions.
          </p>
        </div>

        {/* 2x2 Matrix of 4 Core Steps */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {MVP_FEATURES.map((mvp, idx) => {
            const isActive = activeMvp === mvp.id;
            const stepNumber = idx + 1;

            return (
              <div
                key={mvp.id}
                onClick={() => setActiveMvp(activeMvp === mvp.id ? null : mvp.id)}
                className={`rounded-2xl border transition-all duration-300 cursor-pointer p-4 sm:p-5 flex items-center justify-between group ${
                  isActive
                    ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10'
                    : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center transition-colors shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  <h3 className={`text-sm sm:text-base font-bold leading-snug transition-colors ${
                    isActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                  }`}>
                    {mvp.title}
                  </h3>
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    isActive ? 'rotate-90 text-blue-600 bg-blue-50' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  <ChevronRight size={18} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded Feature Details & Live Interactive Simulator Below 2x2 Matrix */}
        {activeMvp !== null && (
          <div className="mt-6 rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-lg relative overflow-hidden transition-all duration-300">
            {/* Active Module Overview Header */}
            {(() => {
              const current = MVP_FEATURES.find((m) => m.id === activeMvp);
              if (!current) return null;

              return (
                <div className="mb-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                        {current.metrics.value}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">{current.title}</h3>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {current.highlights.map((h, hIdx) => (
                        <span key={hIdx} className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span>{h}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveMvp(null)}
                    className="self-start sm:self-center px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Close</span>
                    <X size={14} />
                  </button>
                </div>
              );
            })()}

            {/* ── MVP 1: Dedicated Workspaces & Setup ── */}
            {activeMvp === 'multitenant' && (
              <div className="space-y-4">
                {/* Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Data Privacy</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">100% Private</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">Confidential Student Records</div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Your student contacts, exam marks, and fee ledgers are strictly private to your institute.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Branch Management</span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Expand Anytime</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">Run 1 Center or Multiple Branches</div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Manage your primary campus or easily connect new branch centers as you grow.
                    </p>
                  </div>
                </div>

                {/* 4-Step Registration Stepper */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Get Started in 4 Simple Steps</span>
                    <span className="text-emerald-700 font-semibold text-[11px]">Ready in Under 10 Mins</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1 text-center">
                      <div className="w-5 h-5 mx-auto rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">✓</div>
                      <div className="font-bold text-slate-900 text-[11px]">1. Institute Profile</div>
                      <p className="text-[10px] text-slate-500">Name, logo & city</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1 text-center">
                      <div className="w-5 h-5 mx-auto rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">✓</div>
                      <div className="font-bold text-slate-900 text-[11px]">2. Director Login</div>
                      <p className="text-[10px] text-slate-500">Secure owner account</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1 text-center">
                      <div className="w-5 h-5 mx-auto rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">✓</div>
                      <div className="font-bold text-slate-900 text-[11px]">3. Verification</div>
                      <p className="text-[10px] text-slate-500">Quick document check</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-blue-200 bg-blue-50/40 space-y-1 text-center">
                      <div className="w-5 h-5 mx-auto rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">🚀</div>
                      <div className="font-bold text-blue-900 text-[11px]">4. Go Live</div>
                      <p className="text-[10px] text-blue-600 font-medium">Start admissions</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Explore CTA inside Bento */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Included in all VidyaSetu plans.</span>
                  <Link to="/register-institute" className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
                    <span>Activate for your academy</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {/* ── MVP 2: Structure & Batches ── */}
            {activeMvp === 'masters' && (
              <div className="space-y-4">
                {/* Sub-level selectors */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setMvp2Level('campuses')}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mvp2Level === 'campuses'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Branches
                  </button>
                  <button
                    onClick={() => setMvp2Level('programs')}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mvp2Level === 'programs'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Courses
                  </button>
                  <button
                    onClick={() => setMvp2Level('batches')}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mvp2Level === 'batches'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Batches
                  </button>
                  <button
                    onClick={() => setMvp2Level('facilities')}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mvp2Level === 'facilities'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Classrooms
                  </button>
                </div>

                {/* Content based on level */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  {mvp2Level === 'campuses' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">Main Branch / Head Office</div>
                          <div className="text-[11px] text-slate-500">Main campus classrooms and local staff.</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                          Active
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">New Branch Centers</div>
                          <div className="text-[11px] text-slate-500">Add new locations and share faculty across branches.</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[11px]">
                          Connected
                        </span>
                      </div>
                    </div>
                  )}

                  {mvp2Level === 'programs' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">Course Curriculum</div>
                          <div className="text-[11px] text-slate-500">Duration, subjects, and teaching milestones.</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                          Configured
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">Subject List</div>
                          <div className="text-[11px] text-slate-500">Weekly lecture hours and exam marks.</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[11px]">
                          Linked
                        </span>
                      </div>
                    </div>
                  )}

                  {mvp2Level === 'batches' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">Morning & Evening Batches</div>
                          <div className="text-[11px] text-slate-500">Shift timings, student caps, and assigned faculty.</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                          Active Roster
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">Annual Batch Promotion</div>
                          <div className="text-[11px] text-slate-500">1-click student rollover to next academic year.</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[11px]">
                          Automated
                        </span>
                      </div>
                    </div>
                  )}

                  {mvp2Level === 'facilities' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">Classrooms & Lecture Halls</div>
                          <div className="text-[11px] text-slate-500">Seating limits and room allocations.</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                          Mapped
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">Labs & Testing Centers</div>
                          <div className="text-[11px] text-slate-500">Computer terminals and lab schedule tracking.</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[11px]">
                          Ready
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Explore CTA inside Bento */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Included in all VidyaSetu subscription packages.</span>
                  <Link to="/register-institute" className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
                    <span>Deploy this module</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {/* ── MVP 3: Admissions & Inquiries ── */}
            {activeMvp === 'crm' && (
              <div className="space-y-4">
                {/* 4 Pipeline Stages */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setMvp3FunnelStage('leads')}
                    className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                      mvp3FunnelStage === 'leads'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <div className="text-[10px] opacity-75">Stage 1</div>
                    <div>Inquiries</div>
                  </button>
                  <button
                    onClick={() => setMvp3FunnelStage('demo')}
                    className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                      mvp3FunnelStage === 'demo'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <div className="text-[10px] opacity-75">Stage 2</div>
                    <div>Demo Class</div>
                  </button>
                  <button
                    onClick={() => setMvp3FunnelStage('eval')}
                    className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                      mvp3FunnelStage === 'eval'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <div className="text-[10px] opacity-75">Stage 3</div>
                    <div>Counseling</div>
                  </button>
                  <button
                    onClick={() => setMvp3FunnelStage('enrolled')}
                    className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                      mvp3FunnelStage === 'enrolled'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <div className="text-[10px] opacity-75">Stage 4</div>
                    <div>Enrolled 🎉</div>
                  </button>
                </div>

                {/* Funnel Stage Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  {mvp3FunnelStage === 'leads' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                        <div className="font-bold text-slate-900">Inquiry Capture</div>
                        <p className="text-[11px] text-slate-500">Captures walk-ins, phone calls, and web forms.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                        <div className="font-bold text-slate-900">WhatsApp Welcome</div>
                        <p className="text-[11px] text-slate-500">Auto-sends brochure and demo info to parents.</p>
                      </div>
                    </div>
                  )}

                  {mvp3FunnelStage === 'demo' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                        <div className="font-bold text-slate-900">Demo Class Booking</div>
                        <p className="text-[11px] text-slate-500">Trial class seats with capacity limits.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                        <div className="font-bold text-slate-900">Diagnostic Marks</div>
                        <p className="text-[11px] text-slate-500">Record trial test scores to suggest the right batch.</p>
                      </div>
                    </div>
                  )}

                  {mvp3FunnelStage === 'eval' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                        <div className="font-bold text-slate-900">Fee Plans & Scholarships</div>
                        <p className="text-[11px] text-slate-500">Flexible installments and scholarship discounts.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                        <div className="font-bold text-slate-900">Follow-Up Reminders</div>
                        <p className="text-[11px] text-slate-500">Automated phone call reminders for counselors.</p>
                      </div>
                    </div>
                  )}

                  {mvp3FunnelStage === 'enrolled' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-0.5">
                        <div className="font-bold text-slate-900">Instant Roll Number & Batch</div>
                        <p className="text-[11px] text-slate-500">Instant student record with zero duplicate typing.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-0.5">
                        <div className="font-bold text-slate-900">Digital Fee Receipt & Parent App</div>
                        <p className="text-[11px] text-slate-500">Auto fee receipt and parent portal access.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Explore CTA inside Bento */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Included in all VidyaSetu subscription packages.</span>
                  <Link to="/register-institute" className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
                    <span>Deploy this module</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {/* ── MVP 4: Timetable & Attendance ── */}
            {activeMvp === 'scheduler' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Live Conflict Detection
                  </span>
                  <button
                    onClick={() => setSimConflictState(!simConflictState)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                  >
                    {simConflictState ? 'Reset To Clash-Free' : 'Simulate Clash Check'}
                  </button>
                </div>

                {/* Constraint Matrix Status */}
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Teacher Availability Check</div>
                      <div className="text-[11px] text-slate-500">Prevents assigning faculty to two batches simultaneously.</div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Clash-Free
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border transition-all text-xs ${
                      simConflictState
                        ? 'bg-rose-50 border-rose-300 text-rose-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">Room Capacity & Double-Booking Guard</div>
                        <div className="text-[11px] text-slate-500">
                          {simConflictState
                            ? 'Simulation: Clash in Hall 2 (2 batches assigned)'
                            : 'Ensures room availability and checks seating capacity.'}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          simConflictState
                            ? 'text-rose-700 bg-rose-100 border border-rose-300 animate-pulse'
                            : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        }`}
                      >
                        {simConflictState ? '⚠️ Clash Flagged' : '✓ Guard Active'}
                      </span>
                    </div>

                    {simConflictState && (
                      <div className="mt-2 pt-2 border-t border-rose-200 text-[11px] text-rose-800 flex items-center justify-between font-medium">
                        <span>Auto-suggestion: Re-route batch to Lecture Hall 4.</span>
                        <button
                          onClick={() => setSimConflictState(false)}
                          className="font-bold underline text-rose-900 hover:text-rose-700 cursor-pointer"
                        >
                          Auto-Resolve
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Mobile Attendance & Parent SMS</div>
                      <div className="text-[11px] text-slate-500">Teachers punch attendance on mobile; absent alerts reach parents instantly.</div>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      Synced
                    </span>
                  </div>
                </div>

                {/* Bottom Explore CTA inside Bento */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Included in all VidyaSetu subscription packages.</span>
                  <Link to="/register-institute" className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
                    <span>Deploy this module</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── ROLE WORKSPACE MATRIX (Showcase for All 6 Roles, scroll-mt-28) ── */}
      <section id="roles" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/80 scroll-mt-28">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold tracking-wider uppercase">
            <span>Tailored User Experiences</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Designed for Every Stakeholder
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Coaching institutes succeed when directors, branch managers, teachers, counselors, and accountants each have a
            dedicated workspace designed specifically for their daily tasks.
          </p>
        </div>

        {/* Roles Tabs */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ROLES_SHOWCASE.map((role) => {
            const isSelected = activeRole === role.id;
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 shadow-md shadow-blue-500/10'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {role.badge.split(' ')[0]}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {role.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Role Detail Box */}
        <div className="mt-8 rounded-3xl p-6 sm:p-10 bg-white border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                {selectedRoleData.badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {selectedRoleData.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {selectedRoleData.description}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-all shadow-sm"
                >
                  <span>Sign In as {selectedRoleData.title.split(' ')[0]}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedRoleData.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-700 font-medium"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <span className="leading-relaxed">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURAL TRANSPARENCY & DATA PRIVACY BENTO (scroll-mt-28) ── */}
      <section id="architecture" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/80 scroll-mt-28">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-bold tracking-wider uppercase">
            <span>Safety & Reliability</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Built for 100% Peace of Mind
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Your coaching academy data is completely private, automatically backed up daily, and always accessible when you need it.
          </p>
        </div>

        {/* 4-Bento Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <ShieldCheck size={20} />
            </div>
            <h4 className="text-base font-bold text-slate-900">100% Private to Your Institute</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your student records, parent contact details, and fee ledgers are strictly private. No other coaching academy can ever see or access your data.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Zap size={20} />
            </div>
            <h4 className="text-base font-bold text-slate-900">Instant WhatsApp & SMS Alerts</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Keep parents informed automatically. Instant alerts are sent within seconds for student absences, fee payment receipts, and trial class confirmations.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Sliders size={20} />
            </div>
            <h4 className="text-base font-bold text-slate-900">Custom Staff Permissions</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              You control what your staff can view or edit. Protect confidential student phone numbers, fee discounts, and financial ledgers with simple access toggles.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock size={20} />
            </div>
            <h4 className="text-base font-bold text-slate-900">Automated Daily Cloud Backups</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your academy data is backed up automatically every day in secure cloud storage. Never worry about losing marks, attendance records, or financial history.
            </p>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION (Transparent & Legible, scroll-mt-28) ── */}
      <section id="pricing" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/80 scroll-mt-28">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold tracking-wider uppercase">
            <span>Predictable Investment</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Simple, Transparent Subscription Plans
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            All plans include core modules, zero per-student transaction fees, and free automated cloud backups.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs font-bold ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Monthly Billing
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-12 h-6 rounded-full bg-slate-200 border border-slate-300 p-0.5 relative transition-colors cursor-pointer"
            >
              <div
                className={`w-5 h-5 rounded-full bg-blue-600 transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              <span>Annual Billing</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {PRICING_PLANS.map((plan) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative bg-white ${
                  plan.popular
                    ? 'border-2 border-blue-600 shadow-xl shadow-blue-500/10'
                    : 'border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900">
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">/ month</span>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                    {plan.features.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-slate-700 font-medium">
                        <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    to="/register-institute"
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold transition-all ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                    }`}
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS (Accordion, scroll-mt-28) ── */}
      <section id="faq" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 max-w-4xl mx-auto border-t border-slate-200/80 scroll-mt-28">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold tracking-wider uppercase">
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Everything you need to know about migrating your coaching institute to VidyaSetu.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-bold text-slate-900 leading-snug">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-500 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>


      {/* ── BOTTOM CTA BANNER ── */}
      <section className="relative z-10 py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="rounded-[2.5rem] p-8 sm:p-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-center space-y-6 relative overflow-hidden shadow-2xl text-white">
          <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">
            Ready to Modernize Your Institute?
          </span>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight max-w-3xl mx-auto">
            Experience the Future of Coaching Academy Administration
          </h2>

          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Join hundreds of forward-thinking coaching centers that have eliminated scheduling friction,
            accelerated student admissions, and plugged fee defaults.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register-institute"
              className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-white text-blue-700 hover:bg-blue-50 text-sm font-bold shadow-lg transition-all active:scale-[0.98]"
            >
              <span>Register Your Institute Now</span>
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight size={12} className="text-blue-700" />
              </div>
            </Link>

            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-blue-800/60 hover:bg-blue-800 border border-blue-400/40 text-white text-sm font-semibold transition-all cursor-pointer"
            >
              <span>Schedule Live Walkthrough</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER (Clean Light Slate) ── */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 p-1 flex items-center justify-center shadow-sm">
                <img src="/logo.png" alt="VidyaSetu" className="w-full h-full object-contain" />
              </div>
              <span className="font-display font-extrabold text-lg text-slate-900">VidyaSetu</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Multi-tenant Education ERP and CRM platform purpose-built for coaching institutes, tuition academies, and test prep centers.
            </p>
            <div className="text-[11px] text-slate-400 font-semibold">
              © {new Date().getFullYear()} VidyaSetu Systems. All rights reserved.
            </div>
          </div>

          {/* Core MVPs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Core MVPs</h4>
            <ul className="space-y-2 text-xs font-medium text-slate-600">
              <li>
                <a href="#mvps" className="hover:text-blue-600 transition-colors">
                  SaaS Multi-Tenancy & Onboarding
                </a>
              </li>
              <li>
                <a href="#mvps" className="hover:text-blue-600 transition-colors">
                  Institute Setup & Academic Masters
                </a>
              </li>
              <li>
                <a href="#mvps" className="hover:text-blue-600 transition-colors">
                  CRM & Admissions Pipeline
                </a>
              </li>
              <li>
                <a href="#mvps" className="hover:text-blue-600 transition-colors">
                  Timetable & Academic Scheduler
                </a>
              </li>
            </ul>
          </div>

          {/* Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Role Portals</h4>
            <ul className="space-y-2 text-xs font-medium text-slate-600">
              <li>
                <Link to="/login" className="hover:text-blue-600 transition-colors">
                  Institute Director Console
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-blue-600 transition-colors">
                  Branch Manager Operations
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-blue-600 transition-colors">
                  Counsellor Lead Workspace
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-blue-600 transition-colors">
                  Faculty Attendance & Homework
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-blue-600 transition-colors">
                  SaaS Platform Super Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-xs font-medium text-slate-600">
              <li>
                <Link to="/register-institute" className="hover:text-blue-600 transition-colors">
                  Register Your Academy
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-blue-600 transition-colors">
                  Client Portal Sign In
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-blue-600 transition-colors">
                  Reset Account Password
                </Link>
              </li>
              <li>
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="hover:text-blue-600 transition-colors text-left cursor-pointer"
                >
                  Request Architecture Demo
                </button>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* ── SCHEDULE DEMO MODAL (Clean Light Theme) ── */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-2xl text-left">
            <button
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {demoSubmitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Walkthrough Request Received!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
                  Our academy onboarding specialist will contact you on WhatsApp / Phone within 2 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">
                    Personalized Walkthrough
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    Schedule a 1-on-1 Architecture Demo
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    See how VidyaSetu fits your specific coaching institute workflow.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={demoFormData.name}
                      onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Institute / Academy Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter coaching institute name"
                      value={demoFormData.instituteName}
                      onChange={(e) => setDemoFormData({ ...demoFormData, instituteName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Mobile Number (WhatsApp)
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Enter 10-digit mobile number"
                        value={demoFormData.phone}
                        onChange={(e) => setDemoFormData({ ...demoFormData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Approximate Students
                      </label>
                      <select
                        value={demoFormData.studentCount}
                        onChange={(e) => setDemoFormData({ ...demoFormData, studentCount: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                      >
                        <option value="Under 100">Under 100 Students</option>
                        <option value="100-300">100 - 300 Students</option>
                        <option value="300-1000">300 - 1,000 Students</option>
                        <option value="1000+">1,000+ Students (Multi-Branch)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                  >
                    Confirm Walkthrough Request
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
                    Zero spam guaranteed. We only use this to schedule your demo.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
