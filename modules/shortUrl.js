import mongoose from "mongoose";
import { nanoid } from "nanoid";

const shortUrlSchema = new mongoose.Schema(
  {
    full: {
      type: String,
      required: true,
      unique: true,
    },
    short: {
      type: String,
      required: true,
      unique: true,
      default: () => nanoid(6),
    },
    clicks: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

const ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);
export default ShortUrl;
