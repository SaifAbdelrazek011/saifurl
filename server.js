import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import ShortUrl from "./modules/shortUrl.js";
import { nanoid } from "nanoid";

import methodOverride from "method-override";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;
const accessToken = process.env.ACCESS_TOKEN;

const app = express();

app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: false }));

// View engine and body parsing
app.set("view engine", "ejs");

// Database connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB", err));

app.get("/", async (req, res) => {
  try {
    const token = req.query.token;
    const shortUrls = await ShortUrl.find();

    if (token === accessToken) {
      return res.render("admin", { shortUrls: shortUrls, token: token });
    }
    res.render("viewer", { shortUrls: shortUrls });
  } catch (error) {
    console.error("Error fetching short URLs:", error);
    res.status(500).send("Internal Server Error");
  }
});

// CREATE A NEW SHORT URL
app.post("/shorturls", async (req, res) => {
  try {
    const { fullUrl, token, customShortUrl } = req.body;
    const domain = `${req.protocol}://${req.headers.host}`;

    if (token !== accessToken) {
      return res.status(403).send("Forbidden: Invalid access token");
    }
    if (!fullUrl) {
      return res.status(400).send("Full URL is required.");
    }

    const short = customShortUrl || nanoid(7);
    const existingShort = await ShortUrl.findOne({ short });
    if (existingShort) {
      return res.status(400).send("Custom short URL already exists.");
    }

    const existingFull = await ShortUrl.findOne({ full: fullUrl });
    if (existingFull) {
      return res
        .status(400)
        .send(
          `Full URL already exists at <a href="${domain}/${existingFull.short}">${domain}/${existingFull.short}</a>`
        );
    }

    await ShortUrl.create({ full: fullUrl, short });
    res.redirect("/?token=" + token);
  } catch (error) {
    console.error("Error creating short URL:", error);
    res.status(500).send("Internal Server Error");
  }
});

// REDIRECT TO THE FULL URL
app.get("/:shorturl", async (req, res) => {
  try {
    const shortUrl = await ShortUrl.findOne({ short: req.params.shorturl });
    if (!shortUrl) return res.sendStatus(404);

    shortUrl.clicks++;
    await shortUrl.save();
    res.redirect(shortUrl.full);
  } catch (error) {
    console.error("Error fetching short URL:", error);
    res.status(500).send("Internal Server Error");
  }
});

// UPDATE AN EXISTING SHORT URL
app.patch("/shorturls/:id", async (req, res) => {
  const { fullUrl, customShortUrl } = req.body;
  const token = req.query.token;
  const id = req.params.id;

  if (token !== accessToken) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  try {
    const updated = await ShortUrl.findByIdAndUpdate(
      id,
      { full: fullUrl, short: customShortUrl },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Short URL not found" });
    }

    res.json({ success: true, updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE A SHORT URL
app.delete("/shorturls/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (token !== accessToken) {
      return res.status(403).send("Forbidden: Invalid access token");
    }

    await ShortUrl.findByIdAndDelete(id);
    res.redirect("/?token=" + token);
  } catch (error) {
    console.error("Error deleting short URL:", error);
    res.status(500).send("Internal Server Error");
  }
});

// START THE SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
