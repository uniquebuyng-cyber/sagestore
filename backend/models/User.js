const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  pin: { type: String, default: null },
  role: { type: String, enum: ['owner', 'manager', 'worker'], default: 'worker' },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', default: null },
  phone: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified('pin') && this.pin) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.matchPin = async function (entered) {
  if (!this.pin) return false;
  return bcrypt.compare(entered, this.pin);
};

module.exports = mongoose.model('User', userSchema);
