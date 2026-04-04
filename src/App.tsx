import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  MapPin, 
  Info, 
  ChevronRight, 
  Search, 
  Bell, 
  Calendar as CalendarIcon,
  Heart,
  Navigation,
  Utensils,
  Home,
  ShieldCheck,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
  Quote
} from 'lucide-react';
import { format, isWithinInterval, parse, set } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { db, auth, logAnalyticsEvent } from './firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Timing {
  open: string;
  close: string;
}

interface TempleTimings {
  morning: Timing;
  evening: Timing;
}

interface Temple {
  id: number;
  name: string;
  specialty: string;
  pro_tip: string;
  event_id: number | null;
  timings: {
    summer: TempleTimings;
    winter: TempleTimings;
  };
  aarti: { name: string; time: string }[];
  last_verified: string;
  visitor_count: number;
  maps_url: string;
}

interface SpecialEvent {
  id: number;
  event: string;
  location: string;
  business_angle: string;
  months: number[];
}

const testimonials = [
  {
    id: 1,
    name: "Dr. Ramesh Sharma",
    role: "Spiritual Researcher",
    content: "Vrindavan 360 Plus has transformed my pilgrimage. The real-time updates are incredibly accurate and save hours of waiting.",
    avatar: "https://i.pravatar.cc/150?u=ramesh"
  },
  {
    id: 2,
    name: "Anjali Gupta",
    role: "Devotee",
    content: "The interface is so clean and professional. I trust this app more than any other guide in the holy city.",
    avatar: "https://i.pravatar.cc/150?u=anjali"
  },
  {
    id: 3,
    name: "John Miller",
    role: "International Pilgrim",
    content: "As a first-time visitor, the 'How We Help' section gave me the confidence I needed to navigate the sacred sites.",
    avatar: "https://i.pravatar.cc/150?u=john"
  }
];

const processSteps = [
  {
    title: "Real-Time Verification",
    description: "We verify temple timings daily with local priests and authorities.",
    icon: <Clock className="w-6 h-6" />
  },
  {
    title: "Expert Curation",
    description: "Every tip and insight is curated by spiritual experts and historians.",
    icon: <ShieldCheck className="w-6 h-6" />
  },
  {
    title: "Seamless Navigation",
    description: "One-click maps and local guidance to ensure you never lose your way.",
    icon: <Navigation className="w-6 h-6" />
  }
];

export default function App() {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEvent, setFilterEvent] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'opening' | 'mostly_visited'>('mostly_visited');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [season, setSeason] = useState<'summer' | 'winter'>(() => {
    const month = new Date().getMonth();
    return (month >= 2 && month <= 9) ? 'summer' : 'winter';
  });
  const [expandedTemple, setExpandedTemple] = useState<number | null>(null);
  const [showAlerts, setShowAlerts] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [editingTemple, setEditingTemple] = useState<Temple | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);

  const handleAdminLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setIsAdminMode(false);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdminMode(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleUpdateTemple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemple) return;

    const path = `temples/${editingTemple.id}`;
    try {
      const templeRef = doc(db, 'temples', editingTemple.id.toString());
      await updateDoc(templeRef, { ...editingTemple, last_verified: `Updated on ${format(new Date(), 'd MMMM, yyyy')}` });
      logAnalyticsEvent('temple_update', { temple_id: editingTemple.id, temple_name: editingTemple.name });
      setEditingTemple(null);
      alert('Temple Updated Successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const migrateInitialData = async () => {
    if (!user || user.email !== 'shivamojha1422000@gmail.com') return;
    
    setIsMigrating(true);
    setMigrationProgress(0);
    try {
      const templesRes = await fetch('/api/temples');
      const eventsRes = await fetch('/api/events');
      const initialTemples = await templesRes.json();
      const initialEvents = await eventsRes.json();

      const totalItems = initialTemples.length + initialEvents.length;
      let completedItems = 0;

      for (const t of initialTemples) {
        await setDoc(doc(db, 'temples', t.id.toString()), t);
        completedItems++;
        setMigrationProgress(Math.round((completedItems / totalItems) * 100));
      }
      for (const e of initialEvents) {
        await setDoc(doc(db, 'events', e.id.toString()), e);
        completedItems++;
        setMigrationProgress(Math.round((completedItems / totalItems) * 100));
      }
      
      logAnalyticsEvent('data_migration_complete');
      
      // Visual "Click" / Success Feedback
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.play().catch(() => {}); // Ignore if browser blocks audio
      
      alert('Data Migrated Successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed. Check console for details.');
    } finally {
      setIsMigrating(false);
    }
  };

  useEffect(() => {
    logAnalyticsEvent('page_view', { page_title: 'Home' });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        logAnalyticsEvent('login', { method: 'Google', user_email: currentUser.email });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const templesQuery = query(collection(db, 'temples'), orderBy('visitor_count', 'desc'));
    const unsubscribeTemples = onSnapshot(templesQuery, (snapshot) => {
      const templeList = snapshot.docs.map(doc => doc.data() as Temple);
      if (templeList.length > 0) {
        setTemples(templeList);
        setLoading(false);
      } else {
        fetch('/api/temples').then(res => res.json()).then(data => {
          setTemples(data);
          setLoading(false);
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'temples');
    });

    const eventsQuery = query(collection(db, 'events'), orderBy('id', 'asc'));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventList = snapshot.docs.map(doc => doc.data() as SpecialEvent);
      if (eventList.length > 0) {
        setEvents(eventList);
      } else {
        fetch('/api/events').then(res => res.json()).then(data => setEvents(data));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const month = now.getMonth();
      const newSeason = (month >= 2 && month <= 9) ? 'summer' : 'winter';
      if (newSeason !== season) setSeason(newSeason);
    }, 1000);

    return () => {
      unsubscribeTemples();
      unsubscribeEvents();
      clearInterval(timer);
    };
  }, [isAuthReady, season]);

  const getTempleStatus = (temple: Temple) => {
    const schedule = temple.timings[season];
    
    if (!schedule) return { isOpen: false, nextEvent: 'Closed', openingTime: null };

    const now = currentTime;
    const morningOpen = parse(schedule.morning.open, 'HH:mm', now);
    const morningClose = parse(schedule.morning.close, 'HH:mm', now);
    const eveningOpen = parse(schedule.evening.open, 'HH:mm', now);
    const eveningClose = parse(schedule.evening.close, 'HH:mm', now);

    const isMorning = isWithinInterval(now, { start: morningOpen, end: morningClose });
    const isEvening = isWithinInterval(now, { start: eveningOpen, end: eveningClose });

    if (isMorning || isEvening) {
      const upcomingAarti = temple.aarti.find(a => parse(a.time, 'HH:mm', now) > now);
      return { 
        isOpen: true, 
        nextEvent: upcomingAarti ? `Next: ${upcomingAarti.name} at ${upcomingAarti.time}` : 'Open for Darshan',
        openingTime: isMorning ? morningOpen : eveningOpen
      };
    }

    let nextOpen = morningOpen;
    if (now > morningClose && now < eveningOpen) {
      nextOpen = eveningOpen;
    } else if (now > eveningClose) {
      nextOpen = set(morningOpen, { date: now.getDate() + 1 });
    }

    return { 
      isOpen: false, 
      nextEvent: `Opens at ${format(nextOpen, 'hh:mm a')}`,
      openingTime: nextOpen
    };
  };

  const filteredTemples = temples
    .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(t => !filterOpen || getTempleStatus(t).isOpen)
    .filter(t => !filterEvent || getEventName(t.event_id) !== null)
    .sort((a, b) => {
      if (sortBy === 'mostly_visited') return b.visitor_count - a.visitor_count;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const statusA = getTempleStatus(a);
      const statusB = getTempleStatus(b);
      if (!statusA.openingTime || !statusB.openingTime) return 0;
      return statusA.openingTime.getTime() - statusB.openingTime.getTime();
    });

  const activeAlerts = events.filter(e => e.months.includes(currentTime.getMonth()));

  // Special Maharaj Token Alert
  const currentHour = currentTime.getHours();
  const isTokenTime = currentHour >= 15 && currentHour <= 23; // 3 PM to 11 PM

  const getEventName = (eventId: number | null) => {
    if (eventId === null) return null;
    const event = events.find(e => e.id === eventId);
    if (!event) return null;
    
    // Only show if it's the current month (seasonal)
    if (!event.months.includes(currentTime.getMonth())) return null;
    
    return event.event;
  };

  return (
    <div className="min-h-screen bg-trust-bg selection:bg-trust-gold/20 font-sans text-trust-navy">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-trust-gold/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-trust-navy flex items-center justify-center text-trust-gold border border-trust-gold/30 shadow-lg shadow-trust-navy/20">
              <span className="font-serif italic text-2xl">V</span>
            </div>
            <div>
              <h1 className="text-xl font-serif italic font-bold text-trust-navy leading-none tracking-tight">Vrindavan <span className="text-trust-gold">360</span></h1>
              <p className="text-[9px] font-bold text-trust-navy/40 uppercase tracking-[0.2em] mt-1">Sacred Heritage Guide</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", season === 'summer' ? "bg-orange-400" : "bg-blue-400")} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{season} Schedule Active</span>
            </div>
            <a href="#temples" className="text-xs font-bold uppercase tracking-widest text-trust-navy hover:text-trust-gold transition-colors">Temples</a>
            <a href="#how-we-help" className="text-xs font-bold uppercase tracking-widest text-trust-navy hover:text-trust-gold transition-colors">Process</a>
            <button 
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2 text-trust-navy hover:bg-slate-50 rounded-full transition-all"
            >
              <Bell className="w-5 h-5" />
              {(activeAlerts.length > 0 || isTokenTime) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-trust-gold rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Side Alerts - Small Message Popup */}
      <AnimatePresence>
        {showAlerts && activeAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className="fixed bottom-6 right-6 z-[60] w-64"
          >
            <div className="bg-trust-navy/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl border border-trust-gold/20 relative">
              <button 
                onClick={() => setShowAlerts(false)}
                className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <CheckCircle2 className="w-3 h-3 text-trust-gold" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-trust-gold animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-trust-gold">Live Alert</span>
              </div>
              <div className="space-y-2">
                {isTokenTime && (
                  <div className="p-2 bg-trust-gold/10 rounded-lg border border-trust-gold/20">
                    <p className="text-[10px] font-bold text-trust-gold uppercase tracking-widest mb-1">Maharaj Darshan Token</p>
                    <p className="text-[11px] leading-tight text-white/90">
                      Line starts at 4 PM. Distribution at 11 PM. First come first serve (90 Men/90 Women).
                    </p>
                  </div>
                )}
                {activeAlerts.map((alert, i) => (
                  <div key={i} className="group cursor-default">
                    <h5 className="text-[11px] font-bold leading-tight group-hover:text-trust-gold transition-colors">{alert.event}</h5>
                    <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-2 h-2" /> {alert.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=2000" 
            alt="Vrindavan Yamuna Ghat" 
            className="w-full h-full object-cover opacity-10 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FDFCF9]/0 via-[#FDFCF9]/80 to-[#FDFCF9]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-trust-gold/10 border border-trust-gold/20 mb-8">
              <Star className="w-3 h-3 text-trust-gold fill-trust-gold" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-trust-navy">Sacred Heritage Guide</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif italic font-bold text-trust-navy mb-8 leading-[1.1] tracking-tight">
              Experience the <span className="text-trust-gold">Divine Essence</span> of Vrindavan
            </h1>
            <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Your premium digital companion for real-time temple timings, sacred events, and curated spiritual insights in the heart of Braj.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a href="#temples" className="btn-primary px-10 py-4 text-sm shadow-2xl shadow-trust-mint/20">
                Explore Temples
              </a>
              <a href="#how-we-help" className="text-xs font-black uppercase tracking-[0.2em] text-trust-navy hover:text-trust-gold transition-all flex items-center gap-2 group">
                Our Verification Process <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-32">
        {/* How We Help - Process Map */}
        <section id="how-we-help" className="mb-32">
          <div className="text-center mb-16">
            <h3 className="section-title">How We Ensure Your Trust</h3>
            <p className="text-slate-500 max-w-2xl mx-auto">Our rigorous verification process ensures that every piece of information you receive is accurate, timely, and spiritually authentic.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {processSteps.map((step, i) => (
              <div key={i} className="card-trust p-8 text-center bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-2xl bg-trust-navy text-white flex items-center justify-center mx-auto mb-6 shadow-xl shadow-trust-navy/20">
                  {step.icon}
                </div>
                <h4 className="text-xl font-bold text-trust-navy mb-3">{step.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Temple List */}
        <section id="temples" className="mb-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h3 className="section-title">Sacred Temple Directory</h3>
              <p className="text-slate-500">Verified real-time status for the most sacred sites in Vrindavan.</p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search temples..." 
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-trust-mint/20 focus:border-trust-mint transition-all outline-none bg-white shadow-sm"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length > 3) {
                    logAnalyticsEvent('search', { query: e.target.value });
                  }
                }}
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-4 mb-8 p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
            <button 
              onClick={() => {
                setFilterOpen(!filterOpen);
                logAnalyticsEvent('filter_toggle', { filter: 'open_now', value: !filterOpen });
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                filterOpen 
                  ? "bg-trust-navy text-white shadow-lg shadow-trust-navy/20" 
                  : "bg-white text-trust-navy border border-slate-200 hover:border-trust-gold"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", filterOpen ? "bg-trust-gold animate-pulse" : "bg-slate-300")} />
              Open Now
            </button>
            
            <button 
              onClick={() => {
                setFilterEvent(!filterEvent);
                logAnalyticsEvent('filter_toggle', { filter: 'special_events', value: !filterEvent });
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                filterEvent 
                  ? "bg-trust-gold text-trust-navy shadow-lg shadow-trust-gold/20" 
                  : "bg-white text-trust-navy border border-slate-200 hover:border-trust-gold"
              )}
            >
              <Star className={cn("w-3 h-3", filterEvent ? "fill-trust-navy" : "text-slate-300")} />
              Special Events
            </button>

            <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block" />

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sort By:</span>
              <select 
                value={sortBy}
                onChange={(e) => {
                  const val = e.target.value as 'name' | 'opening' | 'mostly_visited';
                  setSortBy(val);
                  logAnalyticsEvent('sort_change', { sort_by: val });
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-trust-navy outline-none focus:border-trust-gold transition-all cursor-pointer"
              >
                <option value="mostly_visited">Mostly Visited</option>
                <option value="name">Alphabetical</option>
                <option value="opening">Opening Time</option>
              </select>
            </div>
          </div>
          
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="grid gap-6"
          >
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-12 h-12 border-4 border-trust-mint border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Verifying Sacred Data...</p>
              </div>
            ) : filteredTemples.length > 0 ? (
              filteredTemples.map((temple) => {
                const status = getTempleStatus(temple);
                const isExpanded = expandedTemple === temple.id;
                const currentTimings = temple.timings[season];

                return (
                  <motion.div 
                    key={temple.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className="card-trust overflow-hidden"
                  >
                    <div className="p-6 flex flex-col md:flex-row items-center gap-8">
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                          <h4 className="text-2xl font-black text-trust-navy">{temple.name}</h4>
                          <div className="flex items-center justify-center md:justify-start gap-2">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-2",
                              status.isOpen ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-500 border border-rose-100"
                            )}>
                              <div className={cn(
                                "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]",
                                status.isOpen ? "bg-emerald-500 shadow-emerald-400 animate-pulse" : "bg-rose-500 shadow-rose-400"
                              )} />
                              {status.isOpen ? 'Currently Open' : 'Currently Closed'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-trust-gold uppercase tracking-widest mb-1">Specialty</p>
                            <p className="text-sm text-trust-navy font-bold">{temple.specialty}</p>
                          </div>
                          {getEventName(temple.event_id) && (
                            <div>
                              <p className="text-[10px] font-bold text-trust-mint uppercase tracking-widest mb-1">Associated Event</p>
                              <p className="text-sm text-trust-navy font-bold flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {getEventName(temple.event_id)}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-4">
                          <div className="flex items-center gap-2 text-sm font-bold text-trust-gold">
                            <Clock className="w-4 h-4" />
                            <span>{status.nextEvent}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <ShieldCheck className="w-4 h-4 text-trust-mint" />
                            <span>Verified: {temple.last_verified}</span>
                          </div>
                        </div>

                        {/* Brijwasi Tip */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-3">
                          <Quote className="w-4 h-4 text-trust-gold shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-black text-trust-navy/40 uppercase tracking-widest mb-0.5">Brijwasi Tip</p>
                            <p className="text-xs text-slate-600 font-medium italic">"{temple.pro_tip}"</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 w-full md:w-auto">
                        {user?.email === 'shivamojha1422000@gmail.com' && (
                          <button 
                            onClick={() => {
                              setEditingTemple(temple);
                              logAnalyticsEvent('admin_edit_click', { temple_name: temple.name });
                            }}
                            className="px-6 py-3 rounded-xl bg-trust-gold/10 text-trust-gold text-sm font-bold hover:bg-trust-gold/20 transition-all flex items-center justify-center gap-2"
                          >
                            Edit Data
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const newState = !isExpanded;
                            setExpandedTemple(newState ? temple.id : null);
                            logAnalyticsEvent('temple_expand', { temple_name: temple.name, expanded: newState });
                          }}
                          className="px-6 py-3 rounded-xl bg-slate-100 text-sm font-bold text-trust-navy hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                          {isExpanded ? 'Hide Details' : 'View Details'}
                          <ChevronRight className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")} />
                        </button>
                        <button 
                          onClick={() => {
                            logAnalyticsEvent('navigation_click', { temple_name: temple.name });
                            window.open(temple.maps_url, '_blank');
                          }}
                          className="px-6 py-3 rounded-xl bg-trust-mint text-white text-sm font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                          <Navigation className="w-4 h-4" /> 
                          {temple.id === 21 ? 'Navigate to Soveri Kund' : 'Navigate'}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-50 bg-slate-50/50 overflow-hidden"
                        >
                          <div className="p-8 grid md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                              <h5 className="text-xs font-black text-trust-navy uppercase tracking-widest flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-trust-gold" />
                                {season.toUpperCase()} TIMINGS
                              </h5>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                                  <span className="text-xs font-bold text-slate-400">Morning</span>
                                  <span className="text-sm font-black text-trust-navy">{currentTimings.morning.open} - {currentTimings.morning.close}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                                  <span className="text-xs font-bold text-slate-400">Evening</span>
                                  <span className="text-sm font-black text-trust-navy">{currentTimings.evening.open} - {currentTimings.evening.close}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-black text-trust-navy uppercase tracking-widest flex items-center gap-2">
                                  <Bell className="w-4 h-4 text-trust-mint" />
                                  AARTI SCHEDULE
                                </h5>
                                <div className="flex items-center gap-2 px-3 py-1 bg-trust-gold/10 rounded-full border border-trust-gold/20">
                                  <Info className="w-3 h-3 text-trust-gold" />
                                  <span className="text-[10px] font-bold text-trust-navy">{temple.pro_tip}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {temple.aarti.length > 0 ? (
                                  temple.aarti.map((a, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                                      <span className="text-xs font-bold text-slate-600">{a.name}</span>
                                      <span className="text-sm font-black text-trust-gold">{a.time}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-slate-400 italic">Aarti timings verified locally. Contact temple for updates.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-20 text-center">
                <p className="text-slate-400">No temples found matching your search.</p>
              </div>
            )}
          </motion.div>
        </section>

        {/* Social Proof - Testimonials */}
        <section id="testimonials" className="mb-32 bg-trust-navy rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-trust-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          
          <div className="relative z-10">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-black text-white mb-4">Trusted by Thousands of Seekers</h3>
              <div className="flex justify-center gap-1 mb-2">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-trust-gold fill-trust-gold" />)}
              </div>
              <p className="text-slate-400">Join a community of devotees who rely on Vrindavan 360 Plus.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((t) => (
                <div key={t.id} className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl">
                  <Quote className="w-8 h-8 text-trust-mint mb-6 opacity-50" />
                  <p className="text-slate-300 italic mb-8 leading-relaxed">"{t.content}"</p>
                  <div className="flex items-center gap-4">
                    <img src={t.avatar} className="w-12 h-12 rounded-full border-2 border-trust-mint" alt={t.name} />
                    <div>
                      <h5 className="font-bold text-white">{t.name}</h5>
                      <p className="text-[10px] font-bold text-trust-gold uppercase tracking-widest">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-20">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-4xl font-serif italic font-bold text-trust-navy mb-6">Ready for a Seamless Spiritual Journey?</h3>
            <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">Join thousands of devotees who rely on Vrindavan 360 for accurate timings, expert guides, and a truly immersive sacred experience.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button className="px-12 py-5 rounded-2xl bg-trust-navy text-white font-bold uppercase tracking-widest hover:bg-trust-gold hover:text-trust-navy transition-all duration-300 shadow-2xl shadow-trust-navy/20">Get Started Now</button>
              <button className="px-12 py-5 rounded-2xl font-bold text-trust-navy hover:bg-slate-100 transition-all uppercase tracking-widest text-xs">Learn More</button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 opacity-40 grayscale">
              <div className="flex items-center gap-2 font-black text-xl text-trust-navy italic">TRUSTED</div>
              <div className="flex items-center gap-2 font-black text-xl text-trust-navy italic">VERIFIED</div>
              <div className="flex items-center gap-2 font-black text-xl text-trust-navy italic">SECURE</div>
            </div>
          </div>
        </section>
        {/* SEO & FAQ Section */}
        <section className="mb-32 px-6">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-black text-trust-navy mb-12 text-center">Vrindavan Travel Guide & FAQ</h3>
            <div className="grid gap-8">
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <h4 className="font-bold text-trust-navy mb-3">What are the Vrindavan temple timings today?</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Temple timings in Vrindavan vary by season. Generally, Banke Bihari mandir opening time is 7:45 AM in summer and 8:45 AM in winter. ISKCON Vrindavan aarti schedule starts with Mangala Aarti at 4:30 AM. For real-time updates on Radha Raman temple darshan time and Nidhivan closing time, use our live dashboard above.
                </p>
              </div>
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <h4 className="font-bold text-trust-navy mb-3">How to get Premanand Ji Maharaj Ekantik Vartalap token?</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  To get an Ekantik Vartalap token, you need to visit the Premanand Maharaj ashram location on Sunrakh road early in the morning. Token distribution time usually starts at 2:00 AM. For the latest Shri Hit Radha Kripa Parivar updates and Maharaj ji vartalap registration process, follow our special events section.
                </p>
              </div>
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <h4 className="font-bold text-trust-navy mb-3">Where can I find scooty on rent in Vrindavan?</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  You can find the best bike rental near Vrindavan railway station or near the ISKCON temple. Prices for scooty on rent in Vrindavan usually range from ₹300 to ₹500 per day. E-rickshaws are also a great alternative for short distances between Banke Bihari and other temples.
                </p>
              </div>
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <h4 className="font-bold text-trust-navy mb-3">Are there rooms near Banke Bihari temple?</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Yes, there are many dharamshalas in Vrindavan with affordable prices starting from ₹500. For a more comfortable stay, look for hotels near Raman Reti or Sunrakh road. We also provide contacts for local guides to help you find the best accommodation and online Prasad delivery services.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="bg-white border-t border-slate-100 py-20 px-6">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <button 
            onClick={() => setIsAdminMode(!isAdminMode)}
            className="text-[10px] font-black uppercase tracking-widest text-trust-navy/20 hover:text-trust-navy transition-colors"
          >
            Admin Access
          </button>
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-trust-navy flex items-center justify-center text-trust-gold border border-trust-gold/30 font-serif italic text-lg">V</div>
              <h4 className="text-xl font-serif italic font-bold text-trust-navy">Vrindavan <span className="text-trust-gold">360</span></h4>
            </div>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              The world's most trusted digital companion for the sacred city of Vrindavan. Built on a foundation of accuracy, transparency, and deep spiritual respect.
            </p>
          </div>
          
          <div>
            <h5 className="font-bold text-trust-navy mb-6">Quick Links</h5>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a href="#" className="hover:text-trust-mint transition-colors">Temple Directory</a></li>
              <li><a href="#" className="hover:text-trust-mint transition-colors">Aarti Timings</a></li>
              <li><a href="#" className="hover:text-trust-mint transition-colors">Local Guides</a></li>
              <li><a href="#" className="hover:text-trust-mint transition-colors">Plus Membership</a></li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-bold text-trust-navy mb-6">Support</h5>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a href="#" className="hover:text-trust-mint transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-trust-mint transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-trust-mint transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-trust-mint transition-colors">Help Center</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">© 2026 Vrindavan 360 Plus. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-trust-navy/40 uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" /> Secure SSL
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-trust-navy/40 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3" /> Verified Data
            </div>
          </div>
        </div>
      </footer>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {isAdminMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-trust-navy/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              {!user ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-trust-navy mb-2">Admin Login</h3>
                    <p className="text-sm text-slate-500">Login with Google to manage temple data.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsAdminMode(false)}
                      className="flex-1 py-3 rounded-xl bg-slate-100 text-sm font-bold text-trust-navy"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAdminLogin}
                      className="flex-1 py-3 rounded-xl bg-trust-navy text-white text-sm font-bold flex items-center justify-center gap-2"
                    >
                      Login with Google
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-trust-navy mb-2">Admin Dashboard</h3>
                    <p className="text-sm text-slate-500">Welcome, {user.displayName}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-xs text-emerald-700 font-bold text-center">
                      {user.email === 'shivamojha1422000@gmail.com' 
                        ? "Authorized: You can now edit temple data directly from the cards." 
                        : "Access Denied: Only the business owner can edit data."}
                    </p>
                  </div>
                  {user.email === 'shivamojha1422000@gmail.com' && temples.length > 0 && (
                    <div className="space-y-3">
                      <button 
                        onClick={migrateInitialData}
                        disabled={isMigrating}
                        className={cn(
                          "w-full py-3 rounded-xl text-sm font-bold transition-all",
                          isMigrating ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-trust-gold text-trust-navy hover:shadow-lg"
                        )}
                      >
                        {isMigrating ? 'Syncing Sacred Data...' : 'Sync Local Data to Cloud'}
                      </button>
                      
                      {isMigrating && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-trust-navy uppercase tracking-widest">
                            <span>Progress</span>
                            <span>{migrationProgress}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${migrationProgress}%` }}
                              className="h-full bg-trust-gold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsAdminMode(false)}
                      className="flex-1 py-3 rounded-xl bg-slate-100 text-sm font-bold text-trust-navy"
                    >
                      Close Dashboard
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="flex-1 py-3 rounded-xl bg-rose-50 text-rose-600 text-sm font-bold border border-rose-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Temple Modal */}
      <AnimatePresence>
        {editingTemple && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-trust-navy/60 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl my-8"
            >
              <h3 className="text-2xl font-black text-trust-navy mb-6">Edit {editingTemple.name}</h3>
              <form onSubmit={handleUpdateTemple} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temple Name</label>
                    <input 
                      type="text" 
                      value={editingTemple.name}
                      onChange={(e) => setEditingTemple({...editingTemple, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Specialty</label>
                    <input 
                      type="text" 
                      value={editingTemple.specialty}
                      onChange={(e) => setEditingTemple({...editingTemple, specialty: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Google Maps URL</label>
                  <input 
                    type="text" 
                    value={editingTemple.maps_url}
                    onChange={(e) => setEditingTemple({...editingTemple, maps_url: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visitor Count (Avg)</label>
                    <input 
                      type="number" 
                      value={editingTemple.visitor_count}
                      onChange={(e) => setEditingTemple({...editingTemple, visitor_count: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Verified Text</label>
                    <input 
                      type="text" 
                      value={editingTemple.last_verified}
                      onChange={(e) => setEditingTemple({...editingTemple, last_verified: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm mt-1"
                      placeholder="e.source: Verified on 2 April"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Brijwasi Tip</label>
                  <textarea 
                    value={editingTemple.pro_tip}
                    onChange={(e) => setEditingTemple({...editingTemple, pro_tip: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm mt-1 h-20"
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                  <p className="text-[10px] font-black text-trust-navy uppercase tracking-widest border-b border-slate-200 pb-2">Summer Timings</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Morning Open</label>
                      <input 
                        type="text" 
                        value={editingTemple.timings.summer.morning.open}
                        onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, summer: {...editingTemple.timings.summer, morning: {...editingTemple.timings.summer.morning, open: e.target.value}}}})}
                        className="w-full px-4 py-2 rounded-xl border border-white text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Morning Close</label>
                      <input 
                        type="text" 
                        value={editingTemple.timings.summer.morning.close}
                        onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, summer: {...editingTemple.timings.summer, morning: {...editingTemple.timings.summer.morning, close: e.target.value}}}})}
                        className="w-full px-4 py-2 rounded-xl border border-white text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evening Open</label>
                      <input 
                        type="text" 
                        value={editingTemple.timings.summer.evening.open}
                        onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, summer: {...editingTemple.timings.summer, evening: {...editingTemple.timings.summer.evening, open: e.target.value}}}})}
                        className="w-full px-4 py-2 rounded-xl border border-white text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evening Close</label>
                      <input 
                        type="text" 
                        value={editingTemple.timings.summer.evening.close}
                        onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, summer: {...editingTemple.timings.summer, evening: {...editingTemple.timings.summer.evening, close: e.target.value}}}})}
                        className="w-full px-4 py-2 rounded-xl border border-white text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                  <p className="text-[10px] font-black text-trust-navy uppercase tracking-widest border-b border-slate-200 pb-2">Winter Timings</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Morning Open</label>
                      <input 
                        type="text" 
                        value={editingTemple.timings.winter.morning.open}
                        onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, winter: {...editingTemple.timings.winter, morning: {...editingTemple.timings.winter.morning, open: e.target.value}}}})}
                        className="w-full px-4 py-2 rounded-xl border border-white text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Morning Close</label>
                      <input 
                        type="text" 
                        value={editingTemple.timings.winter.morning.close}
                        onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, winter: {...editingTemple.timings.winter, morning: {...editingTemple.timings.winter.morning, close: e.target.value}}}})}
                        className="w-full px-4 py-2 rounded-xl border border-white text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evening Open</label>
                      <input 
                        type="text" 
                        value={editingTemple.timings.winter.evening.open}
                        onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, winter: {...editingTemple.timings.winter, evening: {...editingTemple.timings.winter.evening, open: e.target.value}}}})}
                        className="w-full px-4 py-2 rounded-xl border border-white text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evening Close</label>
                      <input 
                        type="text" 
                        value={editingTemple.timings.winter.evening.close}
                        onChange={(e) => setEditingTemple({...editingTemple, timings: {...editingTemple.timings, winter: {...editingTemple.timings.winter, evening: {...editingTemple.timings.winter.evening, close: e.target.value}}}})}
                        className="w-full px-4 py-2 rounded-xl border border-white text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                  <p className="text-[10px] font-black text-trust-navy uppercase tracking-widest border-b border-slate-200 pb-2">Aarti Schedule</p>
                  <div className="space-y-3">
                    {editingTemple.aarti.map((a, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          value={a.name}
                          onChange={(e) => {
                            const newAarti = [...editingTemple.aarti];
                            newAarti[idx].name = e.target.value;
                            setEditingTemple({...editingTemple, aarti: newAarti});
                          }}
                          className="px-4 py-2 rounded-xl border border-white text-sm"
                          placeholder="Aarti Name"
                        />
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={a.time}
                            onChange={(e) => {
                              const newAarti = [...editingTemple.aarti];
                              newAarti[idx].time = e.target.value;
                              setEditingTemple({...editingTemple, aarti: newAarti});
                            }}
                            className="flex-1 px-4 py-2 rounded-xl border border-white text-sm"
                            placeholder="Time"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const newAarti = editingTemple.aarti.filter((_, i) => i !== idx);
                              setEditingTemple({...editingTemple, aarti: newAarti});
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => setEditingTemple({...editingTemple, aarti: [...editingTemple.aarti, { name: '', time: '' }]})}
                      className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:border-trust-gold hover:text-trust-gold transition-all"
                    >
                      + Add Aarti
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingTemple(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-sm font-bold text-trust-navy"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-trust-navy text-white text-sm font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

