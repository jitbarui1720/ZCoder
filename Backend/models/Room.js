import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50,
    },
    description: {
        type: String,
        maxlength: 200,
    },
    language: {
        type: String,
        default: "javascript", // Default language
    },
    privacy: {
        type: String,
        enum: ["public", "private"], // Only allow "public" or "private"
        default: "public",
    },
    creator: {
        type: String, // Store the username of the creator
        required: true,
    },
}, { timestamps: true });

export default mongoose.model("Room", roomSchema);
