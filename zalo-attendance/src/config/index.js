import dotenv from 'dotenv';

dotenv.config();

export default {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/zalo-attendance',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openzcaHome: process.env.OPENZCA_HOME || '~/.openzca',
};
