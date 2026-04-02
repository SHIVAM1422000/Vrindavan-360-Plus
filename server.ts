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
      last_verified: "Verified on 2 April",
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
      last_verified: "Verified on 2 April",
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
      id: 3,
      name: "Param Pujya Premanand Ji Maharaj",
      specialty: "Divine Satsang & Ekantik Vartalap",
      pro_tip: "Maharaj ji usually gives darshan during his night walk (Pad-Yatra) around 2:00 AM.",
      visitor_count: 15000,
      last_verified: "Verified from Maharaj ji's SEVAK on 2 April, 2026",
      maps_url: "https://maps.app.goo.gl/p7H8989Qf77777",
      image: "https://picsum.photos/seed/premanand/800/600",
      timings: {
        summer: {
          morning: { open: "02:00 AM", close: "04:00 AM" },
          evening: { open: "05:00 PM", close: "07:00 PM" }
        },
        winter: {
          morning: { open: "02:00 AM", close: "04:00 AM" },
          evening: { open: "05:00 PM", close: "07:00 PM" }
        }
      },
      aarti: [
        { name: "Night Pad-Yatra", time: "02:15 AM" },
        { name: "Satsang", time: "05:30 PM" }
      ]
    },
    {
      id: 4,
      name: "Radha Raman Temple",
      specialty: "Self-Manifested Deity (No human touch)",
      pro_tip: "The fire in the kitchen has been burning for 500+ years. Try the 'Khichdi' prasad.",
      visitor_count: 12000,
      last_verified: "Verified on 2 April",
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
      last_verified: "Verified on 2 April",
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
    }
  ];

  app.get("/api/temples", (req, res) => {
    res.json(temples);
  });

  app.put("/api/temples/:id", (req, res) => {
    const { id } = req.params;
    const updatedTemple = req.body;
    temples = temples.map(t => t.id === parseInt(id) ? updatedTemple : t);
    res.json(updatedTemple);
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
