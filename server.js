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

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.get("/", async (req, res) => {
  const shortUrls = await ShortUrl.find();
  res.render("index", { shortUrls: shortUrls });
});

app.post("/shortUrls", async (req, res) => {
  await ShortUrl.create({ full: req.body.fullUrl });

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
