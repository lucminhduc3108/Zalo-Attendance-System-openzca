import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    zaloId: {
      type: String,
      required: true,
      unique: true,
    },
    zaloName: {
      type: String,
      required: true,
    },
    alias: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['employee', 'manager'],
      default: 'employee',
    },
    department: {
      type: String,
      default: '',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('User', userSchema);
