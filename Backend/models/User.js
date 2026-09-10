import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, minlength: 2, maxlength: 50 },
  lastName: { type: String, minlength: 2, maxlength: 50 },
  username: { type: String, required: true, unique: true, index: true, minlength: 3, maxlength: 20 },
  email:    { type: String, required: true, unique: true, maxlength: 50 },
  password: { type: String, required: true, minlength: 5 },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
