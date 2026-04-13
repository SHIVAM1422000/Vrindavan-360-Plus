import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes (Back-end logic)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Vrindavan 360 Backend is running" });
  });

  // Simple in-memory data store for temples
  let temples = [
    {
      id: 1,
      name: "Banke Bihari Temple",
      specialty: "Spontaneous Darshan & Chamatkar",
      pro_tip: "Reach 30 mins early. Keep your glasses/phones safe from monkeys!",
      visitor_count: 50000,
      last_verified: "Verified on 9 April, 2026",
      maps_url: "https://goo.gl/maps/bankebihari",
      image: "https://picsum.photos/seed/bihari/800/600",
      timings: {
        summer: {
          morning: { open: "07:45 AM", close: "12:00 PM" },
          evening: { open: "05:30 PM", close: "09:30 PM" }
        },
        winter: {
          morning: { open: "08:45 AM", close: "01:00 PM" },
          evening: { open: "04:30 PM", close: "08:30 PM" }
        }
      },
      aarti: [
        { name: "Shringar Aarti", time: "09:00 AM" },
        { name: "Rajbhog Aarti", time: "11:30 AM" },
        { name: "Shayan Aarti", time: "09:15 PM" }
      ]
    },
    {
      id: 2,
      name: "Prem Mandir",
      specialty: "Stunning Light Show & Architecture",
      pro_tip: "Visit after 6:30 PM to see the musical fountain and lighting.",
      visitor_count: 35000,
      last_verified: "Verified on 9 April, 2026",
      maps_url: "https://goo.gl/maps/premmandir",
      image: "https://picsum.photos/seed/prem/800/600",
      timings: {
        summer: {
          morning: { open: "05:30 AM", close: "12:00 PM" },
          evening: { open: "04:30 PM", close: "08:30 PM" }
        },
        winter: {
          morning: { open: "05:30 AM", close: "12:00 PM" },
          evening: { open: "04:30 PM", close: "08:30 PM" }
        }
      },
      aarti: [
        { name: "Sandhya Aarti", time: "07:00 PM" },
        { name: "Musical Fountain", time: "07:30 PM" }
      ]
    },
    {
      id: 4,
      name: "Radha Raman Temple",
      specialty: "Self-Manifested Deity (No human touch)",
      pro_tip: "The fire in the kitchen has been burning for 500+ years. Try the 'Khichdi' prasad.",
      visitor_count: 12000,
      last_verified: "Verified on 9 April, 2026",
      maps_url: "https://goo.gl/maps/radharaman",
      image: "https://picsum.photos/seed/raman/800/600",
      timings: {
        summer: {
          morning: { open: "08:00 AM", close: "12:30 PM" },
          evening: { open: "06:00 PM", close: "09:00 PM" }
        },
        winter: {
          morning: { open: "08:30 AM", close: "01:00 PM" },
          evening: { open: "05:30 PM", close: "08:30 PM" }
        }
      },
      aarti: [
        { name: "Mangala Aarti", time: "05:00 AM" },
        { name: "Sandhya Aarti", time: "06:30 PM" }
      ]
    },
    {
      id: 5,
      name: "Nidhivan",
      specialty: "Raas Leela Sthal (Mysterious Night)",
      pro_tip: "No one is allowed after sunset. Even monkeys leave the premises.",
      visitor_count: 20000,
      last_verified: "Verified on 9 April, 2026",
      maps_url: "https://goo.gl/maps/nidhivan",
      image: "https://picsum.photos/seed/nidhi/800/600",
      timings: {
        summer: {
          morning: { open: "05:00 AM", close: "07:00 PM" },
          evening: { open: "Closed", close: "After Sunset" }
        },
        winter: {
          morning: { open: "06:00 AM", close: "06:00 PM" },
          evening: { open: "Closed", close: "After Sunset" }
        }
      },
      aarti: [
        { name: "Shringar Aarti", time: "08:00 AM" }
      ]
    },
    {
      id: 6,
      name: "Radha Rani Temple (Barsana)",
      specialty: "Birthplace of Shri Radha Rani",
      pro_tip: "Climb 250 steps or use the ropeway. Visit during Radhashtami for a grand experience.",
      visitor_count: 25000,
      last_verified: "Verified on 12 April, 2026",
      maps_url: "https://goo.gl/maps/barsana",
      image: "https://picsum.photos/seed/barsana/800/600",
      timings: {
        summer: {
          morning: { open: "05:00 AM", close: "02:00 PM" },
          evening: { open: "05:00 PM", close: "09:00 PM" }
        },
        winter: {
          morning: { open: "05:30 AM", close: "02:00 PM" },
          evening: { open: "04:30 PM", close: "08:30 PM" }
        }
      },
      aarti: [
        { name: "Mangala Aarti", time: "05:00 AM" },
        { name: "Sandhya Aarti", time: "07:00 PM" }
      ]
    },
    {
      id: 7,
      name: "Nandgaon Temple",
      specialty: "Home of Lord Krishna's childhood",
      pro_tip: "Located on Nandishwar Hill. The view from the top is breathtaking.",
      visitor_count: 18000,
      last_verified: "Verified on 12 April, 2026",
      maps_url: "https://goo.gl/maps/nandgaon",
      image: "https://picsum.photos/seed/nandgaon/800/600",
      timings: {
        summer: {
          morning: { open: "05:00 AM", close: "02:00 PM" },
          evening: { open: "04:00 PM", close: "09:00 PM" }
        },
        winter: {
          morning: { open: "06:00 AM", close: "02:00 PM" },
          evening: { open: "04:00 PM", close: "08:30 PM" }
        }
      },
      aarti: [
        { name: "Mangala Aarti", time: "06:00 AM" }
      ]
    },
    {
      id: 8,
      name: "Gokul Raman Reti",
      specialty: "Sacred Sand where Krishna played",
      pro_tip: "Roll in the sacred sand (Raman Reti) for spiritual blessings. Visit the nearby deer park.",
      visitor_count: 15000,
      last_verified: "Verified on 12 April, 2026",
      maps_url: "https://goo.gl/maps/gokul",
      image: "https://picsum.photos/seed/gokul/800/600",
      timings: {
        summer: {
          morning: { open: "05:00 AM", close: "12:00 PM" },
          evening: { open: "04:00 PM", close: "09:00 PM" }
        },
        winter: {
          morning: { open: "06:00 AM", close: "12:00 PM" },
          evening: { open: "04:00 PM", close: "08:30 PM" }
        }
      },
      aarti: [
        { name: "Sandhya Aarti", time: "07:00 PM" }
      ]
    }
  ];

  let events = [
    {
      id: 1,
      event: "Akshaya Tritiya",
      location: "Banke Bihari (Feet Darshan)",
      business_angle: "Sandalwood (Chandan) Puja Kits",
      months: [4, 5],
      time: "17:00",
      date: "2026-05-10",
      is_recurring: false
    },
    {
      id: 2,
      event: "Yamuna Aarti",
      location: "Vishram Ghat, Mathura",
      business_angle: "Evening Boat Ride & Deep Daan",
      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      time: "18:45",
      is_recurring: true
    },
    {
      id: 3,
      event: "Radha Ashtami",
      location: "Barsana / Rawal",
      business_angle: "Lathmar Holi Style Celebration",
      months: [8, 9],
      time: "04:30",
      date: "2026-09-19",
      is_recurring: false
    }
  ];

  app.get("/api/temples", (req, res) => {
    res.json(temples);
  });

  app.get("/api/events", (req, res) => {
    res.json(events);
  });

  app.put("/api/temples/:id", (req, res) => {
    const { id } = req.params;
    const updatedTemple = req.body;
    temples = temples.map(t => t.id === parseInt(id) ? updatedTemple : t);
    res.json(updatedTemple);
  });

  app.put("/api/events/:id", (req, res) => {
    const { id } = req.params;
    const updatedEvent = req.body;
    events = events.map(e => e.id === parseInt(id) ? updatedEvent : e);
    res.json(updatedEvent);
  });

  // Vite middleware for development (Front-end serving)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
