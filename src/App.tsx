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
  Trash2,
  Quote,
  Compass
} from 'lucide-react';
import { format, isWithinInterval, parse, set, differenceInMinutes } from 'date-fns';
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
  addDoc,
  deleteDoc,
  serverTimestamp,
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
  time?: string; // Optional time in HH:mm format
}

interface Enquiry {
  id: string;
  name: string;
  phone: string;
  enquiry: string;
  timestamp: any;
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
  const [filterWhereNow, setFilterWhereNow] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'opening' | 'mostly_visited'>('mostly_visited');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [season, setSeason] = useState<'summer' | 'winter'>(() => {
    const month = new Date().getMonth();
    return (month >= 2 && month <= 9) ? 'summer' : 'winter';
  });
  const [expandedTemple, setExpandedTemple] = useState<number | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [editingTemple, setEditingTemple] = useState<Temple | null>(null);
  const [editingEvent, setEditingEvent] = useState<SpecialEvent | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappSubmitted, setWhatsappSubmitted] = useState(false);
  const [adminViewEnquiries, setAdminViewEnquiries] = useState(false);
  const [showWhatsappBadge, setShowWhatsappBadge] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState({ name: '', phone: '', enquiry: '' });
  const [hasClickedWhatsapp, setHasClickedWhatsapp] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  const translations = {
    en: {
      nav_temples: "Temples",
      nav_process: "Process",
      hero_title_1: "Sahi jankari aur",
      hero_title_2: "behetar anubhav",
      hero_badge: "Sacred Heritage Guide",
      intro_verified: "Verified Digital Guide",
      intro_dhamvaasi: "Dham-Vaasi",
      intro_radhe: "Radhe Radhe!",
      intro_main: "Main **Shree Hit Ras Naagri Sharan**, pehle Software Engineer tha, par ab pichle 2.5 saal se Shri Dham Vrindavan mein vaas kar raha hoon aur [Param Pujya Premanand Ji Maharaj] ka shishya hoon.",
      intro_goal: "Mera lakshya yatriyon ko thagi se bachana aur unhe Vrindavan ki sahi anubhuti karwana hai. Main yahan apne parivar aur Dham-vaas ki vyavastha ke liye ek Professional & Transparent Digital Companion ke roop mein kaam karta hoon.",
      intro_tagline: "Sahi jankari, Behetar anubhav",
      services_title: "Hamari Trusted Services",
      service_1_title: "Real-time Live Updates",
      service_1_desc: "Mandir ki bheed aur darshan ki sahi timing (Daily Updates).",
      service_2_title: "Live Darshan Assistance",
      service_2_desc: "Darshan mein hone wali pareshaniyon ka digital samadhan.",
      service_3_title: "Genuine Product Orders",
      service_3_desc: "Vrindavan ka asli Prasad, Poshak aur Kanthi (100% Shuddh).",
      service_4_title: "Yatra Guide & Help",
      service_4_desc: "Sahi rasta aur sahi jankari, bina kisi jhol ke.",
      quote: "Sahi jankari aur behetar anubhav—yahi hamari pehchan hai.",
      directory_title: "Sacred Temple Directory",
      directory_desc: "Verified real-time status for the most sacred sites in Vrindavan.",
      search_placeholder: "Search temples...",
      filter_open: "Open Now",
      filter_where_now: "Where to go now?",
      lang_btn: "हिन्दी",
      status_open: "Open",
      status_closed: "Closed",
      next_open: "Opens at",
      next_aarti: "Next Aarti",
      open_darshan: "Open for Darshan",
      sort_by: "Sort By:",
      sort_visited: "Mostly Visited",
      sort_alpha: "Alphabetical",
      sort_opening: "Opening Time",
      loading_data: "Verifying Sacred Data...",
      no_temples: "No temples found matching your search.",
      summer: "Summer",
      winter: "Winter",
      morning: "Morning",
      evening: "Evening",
      aarti: "Aarti",
      last_verified: "Last Verified",
      visitor_count: "Visitors",
      view_details: "View Details",
      hide_details: "Hide Details",
      location: "Location",
      get_directions: "Get Directions",
      whatsapp_help: "Need Help? WhatsApp Us",
      navigate: "Navigate",
      navigate_soveri: "Navigate to Soveri Kund",
      specialty: "Specialty",
      associated_event: "Associated Event",
      verified: "Verified",
      brijwasi_tip: "Brijwasi Tip",
      edit_data: "Edit Data",
      testimonials_title: "Trusted by Thousands of Seekers",
      testimonials_desc: "Join a community of devotees who rely on Vrindavan 360 Plus.",
      cta_title: "Ready for a Seamless Spiritual Journey?",
      cta_desc: "Join thousands of devotees who rely on Vrindavan 360 for accurate timings, expert guides, and a truly immersive sacred experience.",
      cta_btn_start: "Get Started Now",
      cta_btn_learn: "Learn More",
      trusted: "TRUSTED",
      verified_badge: "VERIFIED",
      secure: "SECURE",
    },
    hi: {
      nav_temples: "मंदिर",
      nav_process: "प्रक्रिया",
      hero_title_1: "सही जानकारी और",
      hero_title_2: "बेहतर अनुभव",
      hero_badge: "पवित्र विरासत गाइड",
      intro_verified: "सत्यापित डिजिटल गाइड",
      intro_dhamvaasi: "धाम-वासी",
      intro_radhe: "राधे राधे! 🙏",
      intro_main: "मैं **श्री हित रस नागरी शरण**, पहले सॉफ्टवेयर इंजीनियर था, पर अब पिछले 2.5 साल से श्री धाम वृन्दावन में वास कर रहा हूँ और [परम पूज्य प्रेमानंद जी महाराज] का शिष्य हूँ।",
      intro_goal: "मेरा लक्ष्य यात्रियों को ठगी से बचाना और उन्हें वृन्दावन की सही अनुभूति करवाना है। मैं यहाँ अपने परिवार और धाम-वास की व्यवस्था के लिए एक प्रोफेशनल और पारदर्शी डिजिटल साथी के रूप में काम करता हूँ।",
      intro_tagline: "सही जानकारी, बेहतर अनुभव",
      services_title: "हमारी विश्वसनीय सेवाएँ",
      service_1_title: "रियल-टाइम लाइव अपडेट",
      service_1_desc: "मंदिर की भीड़ और दर्शन की सही टाइमिंग (दैनिक अपडेट)।",
      service_2_title: "लाइव दर्शन सहायता",
      service_2_desc: "दर्शन में होने वाली परेशानियों का डिजिटल समाधान।",
      service_3_title: "असली उत्पाद ऑर्डर",
      service_3_desc: "वृन्दावन का असली प्रसाद, पोशाक और कंठी (100% शुद्ध)।",
      service_4_title: "यात्रा गाइड और सहायता",
      service_4_desc: "सही रास्ता और सही जानकारी, बिना किसी झोल के।",
      quote: "सही जानकारी और बेहतर अनुभव—यही हमारी पहचान है।",
      directory_title: "पवित्र मंदिर निर्देशिका",
      directory_desc: "वृन्दावन के सबसे पवित्र स्थलों के लिए सत्यापित रियल-टाइम स्थिति।",
      search_placeholder: "मंदिर खोजें...",
      filter_open: "अभी खुला है",
      filter_where_now: "अभी कहाँ दर्शन होंगे?",
      lang_btn: "English",
      status_open: "खुला है",
      status_closed: "बंद है",
      next_open: "खुलने का समय",
      next_aarti: "अगली आरती",
      open_darshan: "दर्शन के लिए खुला है",
      sort_by: "क्रमबद्ध करें:",
      sort_visited: "सबसे अधिक देखे गए",
      sort_alpha: "वर्णानुक्रम",
      sort_opening: "खुलने का समय",
      loading_data: "पवित्र डेटा सत्यापित किया जा रहा है...",
      no_temples: "आपकी खोज से मेल खाने वाला कोई मंदिर नहीं मिला।",
      summer: "गर्मी",
      winter: "सर्दी",
      morning: "सुबह",
      evening: "शाम",
      aarti: "आरती",
      last_verified: "अंतिम बार सत्यापित",
      visitor_count: "आगंतुक",
      view_details: "विवरण देखें",
      hide_details: "विवरण छुपाएं",
      location: "स्थान",
      get_directions: "दिशा-निर्देश प्राप्त करें",
      whatsapp_help: "सहायता चाहिए? व्हाट्सएप करें",
      navigate: "रास्ता देखें",
      navigate_soveri: "सोवेरी कुंड का रास्ता देखें",
      specialty: "विशेषता",
      associated_event: "संबंधित कार्यक्रम",
      verified: "सत्यापित",
      brijwasi_tip: "बृजवासी टिप",
      edit_data: "डेटा संपादित करें",
      testimonials_title: "हजारों साधकों द्वारा विश्वसनीय",
      testimonials_desc: "उन भक्तों के समुदाय में शामिल हों जो वृन्दावन 360 प्लस पर भरोसा करते हैं।",
      cta_title: "एक निर्बाध आध्यात्मिक यात्रा के लिए तैयार हैं?",
      cta_desc: "उन हजारों भक्तों में शामिल हों जो सटीक समय, विशेषज्ञ गाइड और वास्तव में गहरे पवित्र अनुभव के लिए वृन्दावन 360 पर भरोसा करते हैं।",
      cta_btn_start: "अभी शुरू करें",
      cta_btn_learn: "अधिक जानें",
      trusted: "विश्वसनीय",
      verified_badge: "सत्यापित",
      secure: "सुरक्षित",
    }
  };

  const t = (key: keyof typeof translations.en) => translations[language][key];
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const SUPER_ADMIN = 'shivamojha1422000@gmail.com';

  const isUserAdmin = (email: string | null | undefined) => {
    if (!email) return false;
    return email === SUPER_ADMIN || admins.includes(email);
  };

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

    const isNew = !temples.find(t => t.id === editingTemple.id);
    const path = `temples/${editingTemple.id}`;
    
    try {
      const templeRef = doc(db, 'temples', editingTemple.id.toString());
      if (isNew) {
        await setDoc(templeRef, { ...editingTemple, last_verified: `Added on ${format(new Date(), 'd MMMM, yyyy')}` });
        logAnalyticsEvent('temple_create', { temple_id: editingTemple.id, temple_name: editingTemple.name });
        alert('Temple Added Successfully');
      } else {
        await updateDoc(templeRef, { ...editingTemple, last_verified: `Updated on ${format(new Date(), 'd MMMM, yyyy')}` });
        logAnalyticsEvent('temple_update', { temple_id: editingTemple.id, temple_name: editingTemple.name });
        alert('Temple Updated Successfully');
      }
      setEditingTemple(null);
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
  };

  const handleDeleteTemple = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this temple? This action cannot be undone.')) return;
    
    const path = `temples/${id}`;
    try {
      await deleteDoc(doc(db, 'temples', id.toString()));
      logAnalyticsEvent('temple_delete', { temple_id: id });
      setEditingTemple(null);
      alert('Temple Deleted Successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    const isNew = !events.find(ev => ev.id === editingEvent.id);
    const path = `events/${editingEvent.id}`;
    
    try {
      const eventRef = doc(db, 'events', editingEvent.id.toString());
      if (isNew) {
        await setDoc(eventRef, { ...editingEvent });
        logAnalyticsEvent('event_create', { event_id: editingEvent.id, event_name: editingEvent.event });
        alert('Event Added Successfully');
      } else {
        await updateDoc(eventRef, { ...editingEvent });
        logAnalyticsEvent('event_update', { event_id: editingEvent.id, event_name: editingEvent.event });
        alert('Event Updated Successfully');
      }
      setEditingEvent(null);
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

    const path = `events/${id}`;
    try {
      await deleteDoc(doc(db, 'events', id.toString()));
      logAnalyticsEvent('event_delete', { event_id: id });
      setEditingEvent(null);
      alert('Event Deleted Successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !isUserAdmin(user?.email)) return;
    if (user?.email !== SUPER_ADMIN) {
      alert('Only the super admin can add new admins.');
      return;
    }
    try {
      await setDoc(doc(db, 'admins', newAdminEmail), { email: newAdminEmail });
      setNewAdminEmail('');
      alert('Admin added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'admins');
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (user?.email !== SUPER_ADMIN) {
      alert('Only the super admin can remove admins.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${email} as admin?`)) return;
    try {
      await deleteDoc(doc(db, 'admins', email));
      alert('Admin removed successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'admins');
    }
  };

  const handleWhatsappSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logAnalyticsEvent('whatsapp_form_submit', { ...whatsappForm });
    
    try {
      await addDoc(collection(db, 'enquiries'), {
        ...whatsappForm,
        timestamp: serverTimestamp()
      });
      setWhatsappSubmitted(true);
      setTimeout(() => {
        setShowWhatsAppModal(false);
        setWhatsappSubmitted(false);
        setWhatsappForm({ name: '', phone: '', enquiry: '' });
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enquiries');
    }
  };

  const migrateInitialData = async () => {
    if (!user || !isUserAdmin(user.email)) return;
    
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
    if (isUserAdmin(user?.email)) {
      const q = query(collection(db, 'enquiries'), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const enquiryList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Enquiry[];
        setEnquiries(enquiryList);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'enquiries');
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const badgeTimer = setTimeout(() => {
      setShowWhatsappBadge(true);
    }, 5000); // 5 seconds delay

    return () => clearTimeout(badgeTimer);
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

    const unsubscribeAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const adminList = snapshot.docs.map(doc => doc.data().email as string);
      setAdmins(adminList);
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
      unsubscribeAdmins();
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
        nextEvent: upcomingAarti ? `${t('next_aarti')}: ${upcomingAarti.name} at ${upcomingAarti.time}` : t('open_darshan'),
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
      nextEvent: `${t('next_open')} ${format(nextOpen, 'hh:mm a')}`,
      openingTime: nextOpen
    };
  };

  const filteredTemples = temples
    .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(t => !filterOpen || getTempleStatus(t).isOpen)
    .filter(t => !filterWhereNow || (getTempleStatus(t).isOpen && t.aarti.some(a => {
      const aartiTime = parse(a.time, 'HH:mm', currentTime);
      const diff = differenceInMinutes(aartiTime, currentTime);
      return diff > 0 && diff <= 120; // Upcoming Aarti within 2 hours
    })))
    .sort((a, b) => {
      if (sortBy === 'mostly_visited') return b.visitor_count - a.visitor_count;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const statusA = getTempleStatus(a);
      const statusB = getTempleStatus(b);
      if (!statusA.openingTime || !statusB.openingTime) return 0;
      return statusA.openingTime.getTime() - statusB.openingTime.getTime();
    });

  const activeAlerts = events.filter(e => {
    const isCorrectMonth = e.months.includes(currentTime.getMonth());
    if (!isCorrectMonth) return false;
    
    if (e.time) {
      try {
        const eventTime = parse(e.time, 'HH:mm', currentTime);
        // Show alert 3 hours before and up to 1 hour after the event
        const startWindow = set(eventTime, { hours: eventTime.getHours() - 3 });
        const endWindow = set(eventTime, { hours: eventTime.getHours() + 1 });
        return isWithinInterval(currentTime, { start: startWindow, end: endWindow });
      } catch (err) {
        console.error('Error parsing event time:', e.time, err);
        return true; // Fallback to showing if parsing fails
      }
    }
    return true; // If no time specified, show for the whole month
  });

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
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-trust-gold/10 px-6 py-2 md:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-trust-gold/30 shadow-lg shadow-trust-navy/10 bg-white group relative shrink-0">
              <img 
                src="/logo.png" 
                alt="Vrindavan 360 Plus" 
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/vrindavan-spirit/200/200';
                }}
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-full" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-serif italic font-black text-trust-navy leading-none tracking-tight">
                Vrindavan <span className="text-trust-gold">360 Plus</span>
              </h1>
              <p className="text-[8px] md:text-[9px] font-black text-trust-navy/50 uppercase tracking-[0.15em] mt-1">
                {t('hero_title_1')} {t('hero_title_2')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const newLang = language === 'en' ? 'hi' : 'en';
                setLanguage(newLang);
                logAnalyticsEvent('language_change', { language: newLang });
              }}
              className="px-4 py-2 bg-trust-navy text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-trust-navy shadow-lg shadow-trust-navy/20"
            >
              {t('lang_btn')}
            </motion.button>

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

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-trust-navy hover:bg-slate-50 rounded-full"
              onClick={() => setShowAlerts(!showAlerts)}
            >
              <Bell className="w-5 h-5" />
              {(activeAlerts.length > 0 || isTokenTime) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-trust-gold rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Floating Notification Button (Right, above WhatsApp) */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setShowAlerts(!showAlerts);
          logAnalyticsEvent('live_updates_click');
        }}
        className={cn(
          "fixed bottom-24 right-4 md:bottom-24 md:right-6 z-[60] w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all border-4 border-white",
          showAlerts ? "bg-trust-gold text-trust-navy" : "bg-trust-navy text-white"
        )}
      >
        <Bell className={cn("w-5 h-5 md:w-6 md:h-6", (activeAlerts.length > 0 || isTokenTime) && "animate-bounce")} />
        <motion.div 
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute -top-2 -right-2 bg-rose-600 text-white text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg border border-white/20"
        >
          <span className="w-1 h-1 bg-white rounded-full animate-ping" />
          LIVE
        </motion.div>
        {(activeAlerts.length > 0 || isTokenTime) && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-trust-gold rounded-full border-2 border-white text-[8px] md:text-[9px] font-black flex items-center justify-center text-trust-navy shadow-sm">
            {activeAlerts.length + (isTokenTime ? 1 : 0)}
          </span>
        )}
      </motion.button>

      {/* Floating WhatsApp Button (Right) */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [1, 1.05, 1], 
          opacity: 1,
          boxShadow: [
            "0 0 0px rgba(212, 175, 55, 0)", 
            "0 0 30px rgba(212, 175, 55, 0.6)", 
            "0 0 0px rgba(212, 175, 55, 0)"
          ]
        }}
        transition={{ 
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 0.3 },
          boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (!hasClickedWhatsapp) {
            logAnalyticsEvent('whatsapp_first_click');
            setHasClickedWhatsapp(true);
          }
          if (isUserAdmin(user?.email)) {
            setAdminViewEnquiries(true);
          } else {
            setAdminViewEnquiries(false);
          }
          setShowWhatsAppModal(true);
          setShowWhatsappBadge(false);
          logAnalyticsEvent('whatsapp_icon_click');
        }}
        className="fixed bottom-8 right-4 md:bottom-6 md:right-6 z-[60] w-12 h-12 md:w-14 md:h-14 bg-[#25D366] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#20ba5a] transition-colors border-4 border-white"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        {showWhatsappBadge && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full border-2 border-white text-[10px] font-black flex items-center justify-center shadow-lg"
          >
            1
          </motion.div>
        )}
      </motion.button>

      {/* WhatsApp Form Modal */}
      <AnimatePresence>
        {showWhatsAppModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWhatsAppModal(false)}
            className="fixed inset-0 z-[100] bg-trust-navy/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#E5DDD5] w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* WhatsApp Style Header */}
              <div className="bg-[#075E54] p-4 flex items-center gap-3 text-white shrink-0">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold">Ras Naagri Sharan</h3>
                  <p className="text-[10px] text-white/70">Online (Radhe Radhe!)</p>
                </div>
                {isUserAdmin(user?.email) && (
                  <button 
                    onClick={() => setAdminViewEnquiries(!adminViewEnquiries)}
                    className="ml-auto px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-[10px] font-bold border border-white/20"
                  >
                    {adminViewEnquiries ? 'Show Form' : `Leads (${enquiries.length})`}
                  </button>
                )}
                <button 
                  onClick={() => setShowWhatsAppModal(false)}
                  className={cn("p-2 hover:bg-white/10 rounded-full transition-colors", !isUserAdmin(user?.email) && "ml-auto")}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Area / Form */}
              <div className="p-6 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat overflow-y-auto custom-scrollbar min-h-[450px]">
                {whatsappSubmitted ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full pt-10 space-y-4"
                  >
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      className="w-20 h-20 bg-[#25D366] rounded-full flex items-center justify-center shadow-xl shadow-[#25D366]/30"
                    >
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-xl font-black text-slate-800">Radhe Radhe!</h3>
                      <p className="text-sm text-slate-600">Aapki enquiry humein mil gayi hai.</p>
                      <p className="text-[10px] text-slate-400 mt-4 italic">Closing in 2 seconds...</p>
                    </div>
                  </motion.div>
                ) : adminViewEnquiries && isUserAdmin(user?.email) ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center bg-white/80 py-1 rounded-full shadow-sm">Recent Enquiries</p>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {enquiries.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-10 bg-white/50 rounded-xl">No enquiries yet.</p>
                      ) : (
                        enquiries.map(enquiry => (
                          <div key={enquiry.id} className="bg-white p-4 rounded-xl rounded-tl-none shadow-sm relative border-l-4 border-[#25D366]">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-[10px] font-black text-trust-navy">{enquiry.name}</p>
                              <p className="text-[8px] text-slate-400">
                                {enquiry.timestamp?.toDate ? format(enquiry.timestamp.toDate(), 'MMM d, h:mm a') : 'Now'}
                              </p>
                            </div>
                            <p className="text-[11px] font-bold text-[#25D366] mb-1">{enquiry.phone}</p>
                            <p className="text-[11px] text-slate-600 italic leading-tight bg-slate-50 p-2 rounded-lg">"{enquiry.enquiry}"</p>
                            <div className="pt-2">
                              <a 
                                href={`https://wa.me/${enquiry.phone.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[9px] font-black text-[#25D366] uppercase tracking-widest hover:underline flex items-center gap-1"
                              >
                                Reply on WhatsApp <ArrowRight className="w-2 h-2" />
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Introduction Message */}
                    <div className="bg-white p-4 rounded-xl rounded-tl-none shadow-sm relative mb-4">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Shree Harivansh !!</p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Main <span className="font-bold text-trust-navy">"Ras Naagri Sharan"</span> pehle Software Engineer tha, par ab sab tyag kar <span className="font-bold text-trust-navy">"Param Pujya Premanand Ji Maharaj"</span> ka sishya hoon aur pichle 2.5 saal se Shri Dham Vrindavan mein vaas kar rha hoon.
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed mt-2">
                        Main apne Vrindavan-Vaas ki vyavastha aur aapki yatra ko sugam banane ke liye ye <span className="font-bold text-trust-navy">Sewa (Scooty Rental / Genuine Product Orders / Guide/ Help/ Live Darshan/ Prasad)</span> pradan karta hoon.
                      </p>
                      <p className="text-xs font-bold text-trust-navy italic mt-2">Seva ke liye sampark kare.</p>
                      <span className="text-[8px] text-slate-400 absolute bottom-1 right-2">Just now</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[85%] relative">
                      <p className="text-xs text-red-600 font-medium">Radhe Radhe! 🙏 Kripya apni jaankari bharein taaki main aapki behtar sewa kar sakoon.</p>
                      <span className="text-[8px] text-slate-400 absolute bottom-1 right-2">Just now</span>
                    </div>

                    <form onSubmit={handleWhatsappSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Name</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Aapka Naam"
                          value={whatsappForm.name}
                          onChange={(e) => setWhatsappForm({...whatsappForm, name: e.target.value})}
                          className="w-full p-3 rounded-xl border-none shadow-sm text-sm outline-none focus:ring-2 focus:ring-[#25D366]/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Phone No</label>
                        <input 
                          required
                          type="tel" 
                          placeholder="WhatsApp Number"
                          value={whatsappForm.phone}
                          onChange={(e) => setWhatsappForm({...whatsappForm, phone: e.target.value})}
                          className="w-full p-3 rounded-xl border-none shadow-sm text-sm outline-none focus:ring-2 focus:ring-[#25D366]/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Enquiry for?</label>
                        <textarea 
                          required
                          rows={3}
                          placeholder="Product Order / Guide / Help..."
                          value={whatsappForm.enquiry}
                          onChange={(e) => setWhatsappForm({...whatsappForm, enquiry: e.target.value})}
                          className="w-full p-3 rounded-xl border-none shadow-sm text-sm outline-none focus:ring-2 focus:ring-[#25D366]/50 resize-none"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-3 mt-2 rounded-xl bg-[#25D366] text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-[#25D366]/20 hover:bg-[#20ba5a] transition-all flex items-center justify-center gap-2"
                      >
                        Send Message
                      </button>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAlerts && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className="fixed bottom-32 right-4 md:bottom-40 md:right-6 z-[60] w-64 max-w-[calc(100vw-2rem)]"
          >
            <div className="bg-trust-navy/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl border border-trust-gold/20 relative">
              <button 
                onClick={() => setShowAlerts(false)}
                className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <CheckCircle2 className="w-3 h-3 text-trust-gold" />
              </button>
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-trust-gold animate-ping" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-trust-gold">Live Updates</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {format(currentTime, 'EEE, MMM d')}
                </span>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {isTokenTime && (
                  <div className="p-2 bg-trust-gold/10 rounded-lg border border-trust-gold/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-trust-gold uppercase tracking-widest">Maharaj Token</p>
                      <span className="text-[8px] font-black bg-trust-gold text-trust-navy px-1.5 py-0.5 rounded">Active Now</span>
                    </div>
                    <p className="text-[11px] leading-tight text-white/90">
                      Line starts at 4 PM. Distribution at 11 PM. First come first serve.
                    </p>
                  </div>
                )}
                {activeAlerts.length === 0 && !isTokenTime ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-4">No live updates at this moment. Radhe Radhe!</p>
                ) : (
                  activeAlerts.map((alert, i) => (
                    <div key={i} className="group cursor-default p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-[11px] font-bold leading-tight group-hover:text-trust-gold transition-colors">
                          {alert.event}
                        </h5>
                        {alert.time && (
                          <span className="text-trust-gold text-[8px] font-black bg-trust-gold/10 px-1.5 py-0.5 rounded border border-trust-gold/20">
                            Starts at {format(parse(alert.time, 'HH:mm', currentTime), 'hh:mm a')}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-2 h-2" /> {alert.location}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header className="relative pt-20 md:pt-32 pb-12 md:pb-20 px-6 overflow-hidden">
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
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-trust-navy">{t('hero_badge')}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif italic font-bold text-trust-navy mb-8 leading-[1.1] tracking-tight">
              {t('hero_title_1')} <span className="text-trust-gold">{t('hero_title_2')}</span>
            </h1>
            
            <div className="max-w-4xl mx-auto bg-white p-8 md:p-16 rounded-[3rem] border border-trust-gold/10 shadow-[0_32px_64px_-12px_rgba(0,65,106,0.08)] mb-16 text-left relative overflow-hidden group">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-trust-gold/5 rounded-full -mr-32 -mt-32 blur-3xl transition-transform group-hover:scale-110" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-trust-navy/5 rounded-full -ml-24 -mb-24 blur-2xl" />
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12 border-b border-slate-100 pb-10">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-trust-navy to-trust-navy/80 flex items-center justify-center shadow-2xl shadow-trust-navy/20 shrink-0 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <img 
                      src="/logo.png" 
                      alt="Shree Hit Ras Naagri Sharan" 
                      className="w-full h-full object-cover rounded-3xl opacity-90"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/vrindavan-guide/200/200';
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> {t('intro_verified')}
                      </span>
                      <span className="px-3 py-1 bg-trust-gold/10 text-trust-gold text-[9px] font-black uppercase tracking-widest rounded-full border border-trust-gold/20">
                        {t('intro_dhamvaasi')}
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-serif italic font-black text-trust-navy leading-tight">
                      Shree Harivansh <span className="text-trust-gold">!!</span>
                    </h2>
                    <p className="text-lg text-slate-400 font-medium italic mt-1">{t('intro_radhe')}</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-5 gap-12 items-start">
                  <div className="md:col-span-3 space-y-8 text-slate-600 leading-relaxed">
                    <div className="relative">
                      <Quote className="absolute -top-6 -left-6 w-12 h-12 text-slate-100 -z-10 rotate-180" />
                      <p className="text-lg md:text-xl font-medium text-slate-700">
                        {t('intro_main').split(/(\*\*.*?\*\*|\[.*?\])/).map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="text-trust-navy font-black">{part.slice(2, -2)}</strong>;
                          }
                          if (part.startsWith('[') && part.endsWith(']')) {
                            return (
                              <span key={i} className="text-xl md:text-2xl font-black text-trust-gold italic uppercase tracking-tight mx-1">
                                "{part.slice(1, -1)}"
                              </span>
                            );
                          }
                          return part;
                        })}
                      </p>
                    </div>
                    
                    <p className="text-base md:text-lg leading-relaxed">
                      {t('intro_goal')}
                    </p>

                    <div className="pt-4 flex items-center gap-4">
                      <div className="w-12 h-px bg-slate-200" />
                      <p className="text-sm font-serif italic text-trust-navy font-bold opacity-60">{t('intro_tagline')}</p>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100 space-y-6">
                    <h4 className="text-[10px] font-black text-trust-navy uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-trust-gold" /> {t('services_title')}
                    </h4>
                    
                    <div className="space-y-4">
                      {[
                        { title: t('service_1_title'), desc: t('service_1_desc') },
                        { title: t('service_2_title'), desc: t('service_2_desc') },
                        { title: t('service_3_title'), desc: t('service_3_desc') },
                        { title: t('service_4_title'), desc: t('service_4_desc') }
                      ].map((service, idx) => (
                        <div key={idx} className="flex gap-3 items-start group/item">
                          <div className="mt-1 bg-white text-emerald-600 p-1 rounded-lg shadow-sm border border-slate-100 group-hover/item:border-emerald-200 transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-trust-navy mb-0.5">{service.title}</p>
                            <p className="text-[10px] text-slate-500 leading-snug">{service.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-trust-navy to-[#002a45] text-white overflow-hidden shadow-2xl shadow-trust-navy/30 relative">
                  <div className="absolute top-0 right-0 opacity-5">
                    <Quote className="w-32 h-32 -mr-12 -mt-12" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <p className="text-base md:text-lg italic font-medium leading-relaxed max-w-xl">
                      "{t('quote')}"
                    </p>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-10 h-10 rounded-full border-2 border-trust-gold/30 flex items-center justify-center">
                        <span className="text-trust-gold font-serif italic font-bold">V</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-trust-gold">Vrindavan 360 Plus</p>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest">Official Digital Companion</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            </div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-32">
        {/* Temple List */}
        <section id="temples" className="mb-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h3 className="section-title">{t('directory_title')}</h3>
              <p className="text-slate-500">{t('directory_desc')}</p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder={t('search_placeholder')}
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
          <div className="flex flex-wrap items-center gap-4 mb-8 p-3 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => {
                setFilterOpen(!filterOpen);
                logAnalyticsEvent('filter_toggle', { filter: 'open_now', value: !filterOpen });
              }}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 relative overflow-hidden group",
                filterOpen 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-[1.05]" 
                  : "bg-emerald-50 text-emerald-700 border-2 border-emerald-100 hover:border-emerald-200 hover:bg-emerald-100/50 shadow-sm"
              )}
            >
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <span className="relative z-10">अभी कहाँ दर्शन होंगे?</span>
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('sort_by')}</span>
              <select 
                value={sortBy}
                onChange={(e) => {
                  const val = e.target.value as 'name' | 'opening' | 'mostly_visited';
                  setSortBy(val);
                  logAnalyticsEvent('sort_change', { sort_by: val });
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-trust-navy outline-none focus:border-trust-gold transition-all cursor-pointer"
              >
                <option value="mostly_visited">{t('sort_visited')}</option>
                <option value="name">{t('sort_alpha')}</option>
                <option value="opening">{t('sort_opening')}</option>
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
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loading_data')}</p>
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
                              {status.isOpen ? t('status_open') : t('status_closed')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-trust-gold uppercase tracking-widest mb-1">{t('specialty')}</p>
                            <p className="text-sm text-trust-navy font-bold">{temple.specialty}</p>
                          </div>
                          {getEventName(temple.event_id) && (
                            <div>
                              <p className="text-[10px] font-bold text-trust-mint uppercase tracking-widest mb-1">{t('associated_event')}</p>
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
                            <span>{t('verified')}: {temple.last_verified}</span>
                          </div>
                        </div>

                        {/* Brijwasi Tip */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-3">
                          <Quote className="w-4 h-4 text-trust-gold shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-black text-trust-navy/40 uppercase tracking-widest mb-0.5">{t('brijwasi_tip')}</p>
                            <p className="text-xs text-slate-600 font-medium italic">"{temple.pro_tip}"</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 w-full md:w-auto">
                        {isUserAdmin(user?.email) && (
                          <button 
                            onClick={() => {
                              setEditingTemple(temple);
                              logAnalyticsEvent('admin_edit_click', { temple_name: temple.name });
                            }}
                            className="px-6 py-3 rounded-xl bg-trust-gold/10 text-trust-gold text-sm font-bold hover:bg-trust-gold/20 transition-all flex items-center justify-center gap-2"
                          >
                            {t('edit_data')}
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
                          {isExpanded ? t('hide_details') : t('view_details')}
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
                          {temple.id === 21 ? t('navigate_soveri') : t('navigate')}
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
                                {season === 'summer' ? t('summer') : t('winter')} {t('aarti').toUpperCase()}
                              </h5>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                                  <span className="text-xs font-bold text-slate-400">{t('morning')}</span>
                                  <span className="text-sm font-black text-trust-navy">{currentTimings.morning.open} - {currentTimings.morning.close}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                                  <span className="text-xs font-bold text-slate-400">{t('evening')}</span>
                                  <span className="text-sm font-black text-trust-navy">{currentTimings.evening.open} - {currentTimings.evening.close}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-black text-trust-navy uppercase tracking-widest flex items-center gap-2">
                                  <Bell className="w-4 h-4 text-trust-mint" />
                                  {t('aarti').toUpperCase()} SCHEDULE
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
              <h3 className="text-3xl font-black text-white mb-4">{t('testimonials_title')}</h3>
              <div className="flex justify-center gap-1 mb-2">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-trust-gold fill-trust-gold" />)}
              </div>
              <p className="text-slate-400">{t('testimonials_desc')}</p>
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
            <h3 className="text-4xl font-serif italic font-bold text-trust-navy mb-6">{t('cta_title')}</h3>
            <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">{t('cta_desc')}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button className="px-12 py-5 rounded-2xl bg-trust-navy text-white font-bold uppercase tracking-widest hover:bg-trust-gold hover:text-trust-navy transition-all duration-300 shadow-2xl shadow-trust-navy/20">{t('cta_btn_start')}</button>
              <button className="px-12 py-5 rounded-2xl font-bold text-trust-navy hover:bg-slate-100 transition-all uppercase tracking-widest text-xs">{t('cta_btn_learn')}</button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 opacity-40 grayscale">
              <div className="flex items-center gap-2 font-black text-xl text-trust-navy italic">{t('trusted')}</div>
              <div className="flex items-center gap-2 font-black text-xl text-trust-navy italic">{t('verified_badge')}</div>
              <div className="flex items-center gap-2 font-black text-xl text-trust-navy italic">{t('secure')}</div>
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
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  Visit the ashram before the timings at morning 6am to get the updated timings from 24*7 enquiry counter or call at 7777048484 anytime to get the recent updates.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full w-fit border border-emerald-100">
                  <ShieldCheck className="w-3 h-3" />
                  Verified from Ashram of Maharaj ji
                </div>
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
            <h5 className="font-bold text-trust-navy mb-6">Popular Searches</h5>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a href="#temples" className="hover:text-trust-mint transition-colors">Banke Bihari Timings</a></li>
              <li><a href="#temples" className="hover:text-trust-mint transition-colors">Prem Mandir Light Show</a></li>
              <li><a href="#temples" className="hover:text-trust-mint transition-colors">ISKCON Vrindavan Aarti</a></li>
              <li><a href="#temples" className="hover:text-trust-mint transition-colors">Nidhivan Closing Time</a></li>
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
                      {isUserAdmin(user.email) 
                        ? "Authorized: You can now edit temple data directly from the cards." 
                        : "Access Denied: Only the business owner can edit data."}
                    </p>
                  </div>
                  {isUserAdmin(user.email) && temples.length > 0 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Management</p>
                        {user?.email === SUPER_ADMIN && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 mb-4">
                            <p className="text-[10px] font-black text-trust-navy uppercase tracking-widest">Manage Admins</p>
                            <form onSubmit={handleAddAdmin} className="flex gap-2">
                              <input 
                                type="email" 
                                placeholder="Admin Email"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs"
                                required
                              />
                              <button type="submit" className="px-4 py-2 bg-trust-navy text-white text-[10px] font-bold rounded-lg">Add</button>
                            </form>
                            <div className="space-y-1">
                              {admins.map(adminEmail => (
                                <div key={adminEmail} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                  <span className="text-[10px] text-slate-600">{adminEmail}</span>
                                  <button onClick={() => handleRemoveAdmin(adminEmail)} className="text-rose-500 hover:text-rose-700">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Temples</p>
                          <button 
                            onClick={() => {
                              const nextId = Math.max(...temples.map(t => t.id), 0) + 1;
                              setEditingTemple({
                                id: nextId,
                                name: 'New Temple',
                                specialty: '',
                                pro_tip: '',
                                event_id: null,
                                timings: {
                                  summer: { morning: { open: '05:00', close: '12:00' }, evening: { open: '16:00', close: '21:00' } },
                                  winter: { morning: { open: '06:00', close: '13:00' }, evening: { open: '15:00', close: '20:00' } }
                                },
                                aarti: [],
                                last_verified: '',
                                visitor_count: 0,
                                maps_url: ''
                              });
                            }}
                            className="text-[10px] font-bold text-trust-navy hover:underline"
                          >
                            + Add Temple
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {temples.map(temple => (
                            <div key={temple.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-trust-navy truncate">{temple.name}</p>
                                <p className="text-[9px] text-slate-400">{temple.specialty}</p>
                              </div>
                              <button 
                                onClick={() => setEditingTemple(temple)}
                                className="px-3 py-1 rounded-lg bg-trust-navy text-white text-[10px] font-bold"
                              >
                                Edit
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Enquiries ({enquiries.length})</p>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {enquiries.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic text-center py-4">No enquiries yet.</p>
                          ) : (
                            enquiries.map(enquiry => (
                              <div key={enquiry.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                <div className="flex justify-between items-start">
                                  <p className="text-xs font-black text-trust-navy">{enquiry.name}</p>
                                  <p className="text-[8px] text-slate-400">
                                    {enquiry.timestamp?.toDate ? format(enquiry.timestamp.toDate(), 'MMM d, h:mm a') : 'Just now'}
                                  </p>
                                </div>
                                <p className="text-[10px] font-bold text-[#25D366]">{enquiry.phone}</p>
                                <p className="text-[10px] text-slate-600 leading-tight">{enquiry.enquiry}</p>
                                <div className="pt-2 flex gap-2">
                                  <a 
                                    href={`https://wa.me/${enquiry.phone.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[9px] font-black text-[#25D366] uppercase tracking-widest hover:underline"
                                  >
                                    Reply on WhatsApp
                                  </a>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Events</p>
                          <button 
                            onClick={() => {
                              const nextId = Math.max(...events.map(e => e.id), 0) + 1;
                              setEditingEvent({
                                id: nextId,
                                event: 'New Event',
                                location: 'Vrindavan',
                                business_angle: '',
                                months: [new Date().getMonth() + 1],
                                time: ''
                              });
                            }}
                            className="text-[10px] font-bold text-trust-navy hover:underline"
                          >
                            + Add Event
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {events.map(event => (
                            <div key={event.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-trust-navy truncate">{event.event}</p>
                                <p className="text-[9px] text-slate-400">{event.time || 'No time set'}</p>
                              </div>
                              <button 
                                onClick={() => setEditingEvent(event)}
                                className="px-3 py-1 rounded-lg bg-trust-navy text-white text-[10px] font-bold"
                              >
                                Edit
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
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

      {/* Edit Event Modal */}
      <AnimatePresence>
        {editingEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-trust-navy/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-trust-navy mb-6">Edit Event</h3>
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event Name</label>
                  <input 
                    type="text" 
                    value={editingEvent.event}
                    onChange={(e) => setEditingEvent({...editingEvent, event: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-trust-gold/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time (HH:mm - 24hr format)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 18:30"
                    value={editingEvent.time || ''}
                    onChange={(e) => setEditingEvent({...editingEvent, time: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-trust-gold/20"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 italic">Leave empty to show for the whole month.</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                    className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-colors"
                    title="Delete Event"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-sm font-bold text-trust-navy"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-trust-navy text-white text-sm font-bold shadow-lg shadow-trust-navy/20"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
              className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl my-8 max-h-[90vh] flex flex-col"
            >
              <h3 className="text-2xl font-black text-trust-navy mb-6">Edit {editingTemple.name}</h3>
              <form onSubmit={handleUpdateTemple} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
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
                    onClick={() => handleDeleteTemple(editingTemple.id)}
                    className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-colors"
                    title="Delete Temple"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
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

