import express from "express";
import Room from "../models/Room.js";

const router = express.Router();

// GET all rooms
router.get("/", async (req, res) => {
    try {
        res.header('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
        const rooms = await Room.find();
        res.status(200).json(rooms);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error", message: err.message });
    }
});


// POST a new room
router.post("/", async (req, res) => {
    try {
        const newRoom = new Room(req.body);
        const savedRoom = await newRoom.save();
        res.status(201).json({
            message: "Room created successfully",
            room: savedRoom,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error", message: err.message });
    }
});

// GET a specific room by ID (for joining)
router.get("/join/:roomId", async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }
        res.status(200).json({ message: "Room found", room });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error", message: err.message });
    }
});

export default router;
