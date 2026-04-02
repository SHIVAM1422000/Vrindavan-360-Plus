import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Temple Data
  let temples = [
    {
      id: 1,
      name: "Banke Bihari Temple",
      specialty: "Swing Festival (Jhulan)",
      pro_tip: "Check the 'Parda' (curtain) timings to catch the full gaze.",
      event_id: 2, // Phoolon ki Holi
      visitor_count: 50000,
      timings: {
        summer: { morning: { open: "07:30", close: "12:00" }, evening: { open: "17:30", close: "21:30" } },
        winter: { morning: { open: "08:30", close: "13:00" }, evening: { open: "16:30", close: "20:30" } }
      },
      aarti: [{ name: "Shringar Aarti", time: "09:00" }, { name: "Rajbhog Aarti", time: "11:30" }, { name: "Shayan Aarti", time: "21:15" }],
      last_verified: "Today, 07:00 AM",
      maps_url: "https://www.google.com/maps/search/Banke+Bihari+Temple+Vrindavan"
    },
    {
      id: 2,
      name: "Prem Mandir",
      specialty: "Musical Fountain",
      pro_tip: "Reach 30 mins early for the 7 PM light show.",
      event_id: 20, // New Year Chappan Bhog
      visitor_count: 40000,
      timings: {
        summer: { morning: { open: "05:30", close: "12:00" }, evening: { open: "16:30", close: "21:00" } },
        winter: { morning: { open: "05:30", close: "12:00" }, evening: { open: "16:30", close: "21:00" } }
      },
      aarti: [{ name: "Aarti", time: "05:30" }, { name: "Bhog", time: "11:30" }, { name: "Fountain Show", time: "19:00" }],
      last_verified: "Today, 05:30 AM",
      maps_url: "https://www.google.com/maps/search/Prem+Mandir+Vrindavan"
    },
    {
      id: 3,
      name: "ISKCON (Krishna Balaram)",
      specialty: "24-Hour Kirtan",
      pro_tip: "Join the 4:30 AM Mangala Aarti for the highest energy.",
      event_id: 10, // Annakut Festival
      visitor_count: 30000,
      timings: {
        summer: { morning: { open: "04:30", close: "12:45" }, evening: { open: "16:30", close: "20:45" } },
        winter: { morning: { open: "04:30", close: "12:45" }, evening: { open: "16:30", close: "20:45" } }
      },
      aarti: [{ name: "Mangala Aarti", time: "04:30" }, { name: "Tulsi Aarti", time: "05:00" }, { name: "Sandhya Aarti", time: "19:00" }],
      last_verified: "Today, 04:30 AM",
      maps_url: "https://www.google.com/maps/search/ISKCON+Vrindavan"
    },
    {
      id: 4,
      name: "Radha Raman Temple",
      specialty: "Self-Manifested Deity",
      pro_tip: "The kitchen fire here hasn't gone out for 500 years.",
      event_id: 19, // Prakatya Mahotsav
      visitor_count: 15000,
      timings: {
        summer: { morning: { open: "08:00", close: "12:30" }, evening: { open: "18:00", close: "21:30" } },
        winter: { morning: { open: "09:00", close: "13:30" }, evening: { open: "17:00", close: "20:30" } }
      },
      aarti: [{ name: "Mangala", time: "05:30" }, { name: "Sandhya", time: "18:30" }],
      last_verified: "Today, 08:00 AM",
      maps_url: "https://www.google.com/maps/search/Radha+Raman+Temple+Vrindavan"
    },
    {
      id: 5,
      name: "Nidhivan",
      specialty: "Mystical Ras Leela",
      pro_tip: "Leave before sunset; monkeys are very active here.",
      event_id: 5, // Sharad Purnima
      visitor_count: 25000,
      timings: {
        summer: { morning: { open: "05:00", close: "19:00" }, evening: { open: "05:00", close: "19:00" } },
        winter: { morning: { open: "06:00", close: "18:00" }, evening: { open: "06:00", close: "18:00" } }
      },
      aarti: [],
      last_verified: "Today, 06:00 AM",
      maps_url: "https://www.google.com/maps/search/Nidhivan+Vrindavan"
    },
    {
      id: 6,
      name: "Radha Vallabh Temple",
      specialty: "Radhashtami Celebrations",
      pro_tip: "Try the 'Khichdi' prasad here in the morning.",
      event_id: 4, // Radhashtami
      visitor_count: 12000,
      timings: {
        summer: { morning: { open: "08:00", close: "12:00" }, evening: { open: "18:00", close: "21:00" } },
        winter: { morning: { open: "09:00", close: "13:00" }, evening: { open: "17:00", close: "20:00" } }
      },
      aarti: [],
      last_verified: "Today, 08:00 AM",
      maps_url: "https://www.google.com/maps/search/Radha+Vallabh+Temple+Vrindavan"
    },
    {
      id: 7,
      name: "Priyakanth Ju Temple",
      specialty: "Lotus Shape Architecture",
      pro_tip: "Best visited at night when the lotus lights up.",
      event_id: null,
      visitor_count: 10000,
      timings: {
        summer: { morning: { open: "06:00", close: "12:30" }, evening: { open: "16:30", close: "21:00" } },
        winter: { morning: { open: "06:30", close: "13:00" }, evening: { open: "16:00", close: "20:30" } }
      },
      aarti: [],
      last_verified: "Today, 06:00 AM",
      maps_url: "https://www.google.com/maps/search/Priyakanth+Ju+Temple+Vrindavan"
    },
    {
      id: 8,
      name: "Dwarkadhish (Mathura)",
      specialty: "Grand Hindola",
      pro_tip: "Take the boat across Yamuna to reach easily.",
      event_id: null,
      visitor_count: 8000,
      timings: {
        summer: { morning: { open: "06:30", close: "11:00" }, evening: { open: "16:00", close: "19:00" } },
        winter: { morning: { open: "07:00", close: "11:30" }, evening: { open: "15:30", close: "18:30" } }
      },
      aarti: [],
      last_verified: "Today, 06:30 AM",
      maps_url: "https://www.google.com/maps/search/Dwarkadhish+Temple+Mathura"
    },
    {
      id: 9,
      name: "Katyayani Peeth",
      specialty: "Shakti Peeth Energy",
      pro_tip: "Silent meditation is encouraged here.",
      event_id: null,
      visitor_count: 5000,
      timings: {
        summer: { morning: { open: "07:00", close: "12:00" }, evening: { open: "17:00", close: "20:00" } },
        winter: { morning: { open: "07:30", close: "12:30" }, evening: { open: "16:30", close: "19:30" } }
      },
      aarti: [],
      last_verified: "Today, 07:00 AM",
      maps_url: "https://www.google.com/maps/search/Katyayani+Peeth+Vrindavan"
    },
    {
      id: 10,
      name: "Shahji Temple",
      specialty: "Marble Pillars (Twisted)",
      pro_tip: "Visit the 'Darbar Hall' (Chandelier Room) only open twice a year.",
      event_id: 11, // Vasant Panchami
      visitor_count: 3000,
      timings: {
        summer: { morning: { open: "08:00", close: "12:00" }, evening: { open: "17:30", close: "20:30" } },
        winter: { morning: { open: "08:30", close: "12:30" }, evening: { open: "17:00", close: "20:00" } }
      },
      aarti: [],
      last_verified: "Today, 08:00 AM",
      maps_url: "https://www.google.com/maps/search/Shahji+Temple+Vrindavan"
    },
    {
      id: 11,
      name: "Govind Dev Ji",
      specialty: "Red Sandstone Giant",
      pro_tip: "Akbar built this; look for the high ceilings.",
      event_id: null,
      visitor_count: 4000,
      timings: {
        summer: { morning: { open: "08:00", close: "12:30" }, evening: { open: "17:30", close: "20:30" } },
        winter: { morning: { open: "08:30", close: "13:00" }, evening: { open: "17:00", close: "20:00" } }
      },
      aarti: [],
      last_verified: "Today, 08:00 AM",
      maps_url: "https://www.google.com/maps/search/Govind+Dev+Ji+Temple+Vrindavan"
    },
    {
      id: 12,
      name: "Rangnath Ji",
      specialty: "South Indian Style",
      pro_tip: "Don't miss the 50ft gold-plated pillar (Dhvajastambha).",
      event_id: null,
      visitor_count: 7000,
      timings: {
        summer: { morning: { open: "05:30", close: "11:00" }, evening: { open: "16:00", close: "21:00" } },
        winter: { morning: { open: "06:00", close: "11:30" }, evening: { open: "15:30", close: "20:30" } }
      },
      aarti: [],
      last_verified: "Today, 05:30 AM",
      maps_url: "https://www.google.com/maps/search/Rangnath+Ji+Temple+Vrindavan"
    },
    {
      id: 13,
      name: "Madan Mohan Temple",
      specialty: "Oldest Temple",
      pro_tip: "It's on a hill; great view of the Yamuna from the top.",
      event_id: null,
      visitor_count: 2000,
      timings: {
        summer: { morning: { open: "07:00", close: "12:00" }, evening: { open: "17:00", close: "20:00" } },
        winter: { morning: { open: "07:30", close: "12:30" }, evening: { open: "16:30", close: "19:30" } }
      },
      aarti: [],
      last_verified: "Today, 07:00 AM",
      maps_url: "https://www.google.com/maps/search/Madan+Mohan+Temple+Vrindavan"
    },
    {
      id: 14,
      name: "Gopeshwar Mahadev",
      specialty: "Shiva as a Gopi",
      pro_tip: "Visit at night to see Lord Shiva dressed as a woman.",
      event_id: null,
      visitor_count: 6000,
      timings: {
        summer: { morning: { open: "05:00", close: "12:00" }, evening: { open: "17:00", close: "21:00" } },
        winter: { morning: { open: "06:00", close: "12:30" }, evening: { open: "16:30", close: "20:30" } }
      },
      aarti: [],
      last_verified: "Today, 05:00 AM",
      maps_url: "https://www.google.com/maps/search/Gopeshwar+Mahadev+Temple+Vrindavan"
    },
    {
      id: 15,
      name: "Garud Govind",
      specialty: "Kalsarp Dosh Puja",
      pro_tip: "Famous for removing astrological hurdles.",
      event_id: null,
      visitor_count: 1500,
      timings: {
        summer: { morning: { open: "06:00", close: "12:00" }, evening: { open: "16:00", close: "20:00" } },
        winter: { morning: { open: "06:30", close: "12:30" }, evening: { open: "15:30", close: "19:30" } }
      },
      aarti: [],
      last_verified: "Today, 06:00 AM",
      maps_url: "https://www.google.com/maps/search/Garud+Govind+Temple+Vrindavan"
    },
    {
      id: 16,
      name: "Seva Kunj",
      specialty: "Radha-Krishna Resting Place",
      pro_tip: "Carry no food items; monkeys here are experts.",
      event_id: null,
      visitor_count: 5000,
      timings: {
        summer: { morning: { open: "08:00", close: "18:00" }, evening: { open: "08:00", close: "18:00" } },
        winter: { morning: { open: "09:00", close: "17:00" }, evening: { open: "09:00", close: "17:00" } }
      },
      aarti: [],
      last_verified: "Today, 08:00 AM",
      maps_url: "https://www.google.com/maps/search/Seva+Kunj+Vrindavan"
    },
    {
      id: 17,
      name: "Imli Tala",
      specialty: "Chaitanya Mahaprabhu Site",
      pro_tip: "Very peaceful for deep meditation/Japa.",
      event_id: null,
      visitor_count: 1000,
      timings: {
        summer: { morning: { open: "06:00", close: "12:00" }, evening: { open: "16:00", close: "20:00" } },
        winter: { morning: { open: "06:30", close: "12:30" }, evening: { open: "15:30", close: "19:30" } }
      },
      aarti: [],
      last_verified: "Today, 06:00 AM",
      maps_url: "https://www.google.com/maps/search/Imli+Tala+Vrindavan"
    },
    {
      id: 18,
      name: "Jaipur Temple",
      specialty: "Ornate Carvings",
      pro_tip: "Best example of Rajasthani architecture in Braj.",
      event_id: null,
      visitor_count: 800,
      timings: {
        summer: { morning: { open: "08:00", close: "12:00" }, evening: { open: "17:30", close: "20:30" } },
        winter: { morning: { open: "08:30", close: "12:30" }, evening: { open: "17:00", close: "20:00" } }
      },
      aarti: [],
      last_verified: "Today, 08:00 AM",
      maps_url: "https://www.google.com/maps/search/Jaipur+Temple+Vrindavan"
    },
    {
      id: 19,
      name: "Kusum Sarovar",
      specialty: "Sandstone Ghats",
      pro_tip: "The water reflection at sunset is world-class.",
      event_id: 7, // Chhappan Bhog
      visitor_count: 3000,
      timings: {
        summer: { morning: { open: "06:00", close: "19:00" }, evening: { open: "06:00", close: "19:00" } },
        winter: { morning: { open: "07:00", close: "18:00" }, evening: { open: "07:00", close: "18:00" } }
      },
      aarti: [],
      last_verified: "Today, 06:00 AM",
      maps_url: "https://www.google.com/maps/search/Kusum+Sarovar+Vrindavan"
    },
    {
      id: 20,
      name: "Vaishno Devi Dham",
      specialty: "Giant Maa Durga Statue",
      pro_tip: "Good for families with kids; has a cave walkthrough.",
      event_id: null,
      visitor_count: 12000,
      timings: {
        summer: { morning: { open: "06:00", close: "21:00" }, evening: { open: "06:00", close: "21:00" } },
        winter: { morning: { open: "06:00", close: "21:00" }, evening: { open: "06:00", close: "21:00" } }
      },
      aarti: [],
      last_verified: "Today, 06:00 AM",
      maps_url: "https://www.google.com/maps/search/Vaishno+Devi+Dham+Vrindavan"
    },
    {
      id: 21,
      name: "Param Pujya Premanand Ji Maharaj",
      specialty: "Daily 6 AM Darshan at Soveri Kund",
      pro_tip: "Ekantik Vartalap Token: Line starts at 4 PM, Distribution at 11 PM. Only 90 Men & 90 Women.",
      event_id: null,
      visitor_count: 60000,
      timings: {
        summer: { morning: { open: "06:00", close: "07:00" }, evening: { open: "16:00", close: "23:00" } },
        winter: { morning: { open: "06:00", close: "07:00" }, evening: { open: "16:00", close: "23:00" } }
      },
      aarti: [
        { name: "Darshan", time: "06:00" },
        { name: "Token Line Start", time: "16:00" },
        { name: "Token Distribution", time: "23:00" }
      ],
      last_verified: "Verified from Maharaj ji's SEVAK on 2 April, 2026",
      maps_url: "https://maps.app.goo.gl/UgEBq5hYyeNgd6hMA"
    }
  ];

  const events = [
    {id: 1, "event": "Lathmar Holi", "location": "Barsana/Nandgaon", "business_angle": "Luxury Tent Stays & Transport", months: [2]},
    {id: 2, "event": "Phoolon ki Holi", "location": "Banke Bihari", "business_angle": "Flower Petal Supply/Arrangements", months: [2]},
    {id: 3, "event": "Janmashtami Midnight Aarti", "location": "All Temples", "business_angle": "VIP Access/Crowd Management", months: [7, 8]},
    {id: 4, "event": "Radhashtami", "location": "Radha Vallabh", "business_angle": "Prasad Distribution Sponsoring", months: [8]},
    {id: 5, "event": "Sharad Purnima", "location": "Nidhivan", "business_angle": "Kheer Distribution Packages", months: [9]},
    {id: 6, "event": "Hariyali Teej", "location": "Banke Bihari", "business_angle": "Special Green Dress/Shringar Sales", months: [6, 7]},
    {id: 7, "event": "Chhappan Bhog", "location": "Govardhan", "business_angle": "Bhog Offering Coordination", months: [10]},
    {id: 8, "event": "Govardhan Puja", "location": "Anywhere", "business_angle": "Guided Parikrama Service", months: [10]},
    {id: 9, "event": "Kartik Maas Deep Daan", "location": "Yamuna Ghats", "business_angle": "Eco-friendly Diya Kits", months: [9, 10]},
    {id: 10, "event": "Annakut Festival", "location": "ISKCON", "business_angle": "Charity/Donation Assistance", months: [10]},
    {id: 11, "event": "Vasant Panchami", "location": "Shahji Temple", "business_angle": "Yellow Theme Event Planning", months: [0, 1]},
    {id: 12, "event": "Guru Purnima", "location": "Mansi Ganga", "business_angle": "Ashram Stay Bookings", months: [6]},
    {id: 13, "event": "Akshaya Tritiya", "location": "Banke Bihari (Feet Darshan)", "business_angle": "Sandalwood (Chandan) Puja Kits", months: [3, 4]},
    {id: 14, "event": "Jhulan Yatra", "location": "All Temples", "business_angle": "Swing Decoration Service", months: [7]},
    {id: 15, "event": "Ganga Dashara", "location": "Yamuna Bank", "business_angle": "Private Boat Rental", months: [5]},
    {id: 16, "event": "Devotthan Ekadashi", "location": "Parikrama Marg", "business_angle": "E-Rickshaw Network commissions", months: [10]},
    {id: 17, "event": "Braj Chaurasi Kos Yatra", "location": "Whole Braj Area", "business_angle": "40-Day Pilgrimage Logistics", months: [8, 9]},
    {id: 18, "event": "Yamuna Aarti", "location": "Keshi Ghat", "business_angle": "Reserved Seating & Diya Sewa", months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]},
    {id: 19, "event": "Prakatya Mahotsav", "location": "Radha Raman", "business_angle": "Historical Storytelling Tours", months: [4]},
    {id: 20, "event": "New Year Chappan Bhog", "location": "Prem Mandir", "business_angle": "Crowd-free Darshan Planning", months: [0]}
  ];

  // API Routes
  app.get("/api/temples", (req, res) => {
    res.json(temples);
  });

  app.post("/api/temples/:id", express.json(), (req, res) => {
    const id = parseInt(req.params.id);
    const updatedData = req.body;
    const index = temples.findIndex(t => t.id === id);
    
    if (index !== -1) {
      temples[index] = { ...temples[index], ...updatedData, last_verified: "Updated Now" };
      res.json(temples[index]);
    } else {
      res.status(404).json({ error: "Temple not found" });
    }
  });

  app.get("/api/events", (req, res) => {
    res.json(events);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
