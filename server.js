import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import ShortUrl from "./modules/shortUrl.js";

dotenv.config({ path: ".env.local" });

const MONGDB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

const app = express();

mongoose
  .connect(MONGDB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB", err));

// Access token from environment variable
const accessToken = process.env.ACCESS_TOKEN;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.get("/", async (req, res) => {
  const shortUrls = await ShortUrl.find();
  res.render("index", { shortUrls: shortUrls });
});

app.get("/new", (req, res) => {
  const token = req.query.token;

  if (token !== accessToken) {
    return res.status(403).send("Forbidden: Invalid access token");
  }

  res.render("new", { token });
});

app.post("/shortUrls", async (req, res) => {
  const { fullUrl, token, customShortUrl } = req.body;

  const domain = req.protocol + "://" + req.headers.host;

  // Check if the token is valid
  if (token !== accessToken) {
    return res.status(403).send("Forbidden: Invalid access token");
  }

  // If a custom short URL is provided, use it, else generate a new one
  let shortUrl = customShortUrl || nanoid(7); // Generate a short URL if none is provided

  // Ensure the custom short URL is unique
  const existingUrl = await ShortUrl.findOne({ short: shortUrl });
  if (existingUrl) {
    return res.status(400).send("Custom short URL already exists.");
  }

  if (!fullUrl) {
    return res.status(400).send("Full URL is required.");
  }

  const existingFullUrl = await ShortUrl.findOne({ full: fullUrl });
  if (existingFullUrl) {
    return res
      .status(400)
      .send(
        `Full URL already exists at <a href="${domain}/${existingFullUrl.short}">${domain}/${existingFullUrl.short}</a>`
      );
  }

  // Create and save the new short URL
  await ShortUrl.create({ full: fullUrl, short: shortUrl });

  res.redirect("/");
});

app.get("/:shortUrl", async (req, res) => {
  const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });

  if (shortUrl == null) return res.sendStatus(404);

  shortUrl.clicks++;
  await shortUrl.save();
  res.redirect(shortUrl.full);
});

app.listen(PORT || 3000);
