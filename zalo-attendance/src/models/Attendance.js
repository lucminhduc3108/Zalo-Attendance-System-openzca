import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    zaloId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    checkin: {
      type: Date,
      default: null,
    },
    checkinNote: {
      type: String,
      default: '',
    },
    checkout: {
      type: Date,
      default: null,
    },
    checkoutNote: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['completed', 'missing_checkout'],
      default: 'missing_checkout',
    },
  },
  {
    timestamps: true,
  }
);

// Index cho truy vấn nhanh theo ngày + zaloId
attendanceSchema.index({ zaloId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
