import express from "express";
import cors from "cors";
import { config } from "./config"; // Import your config

const app = express();

// Enable CORS for your frontend
app.use(
  cors({
    origin: config.clientUrl, // Allow requests from your Next.js frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Basic route for testing (optional)
app.get("/", (req, res) => {
  res.send("GuessMatesCountry Backend is running!");
});

export default app;
