import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

// Sets the authorized admin account to the exact credentials used by the app:
//   email:    admin@farm.com
//   password: admin@123
const updateAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farm_marketplace');
    console.log('✅ Connected to MongoDB');

    const admin = await User.findOne({ email: 'admin@farm.com' });
    if (!admin) {
      console.log('⚠️  Admin user (admin@farm.com) not found. Run `npm run seed:admin` first.');
      await mongoose.connection.close();
      process.exit(0);
      return;
    }

    admin.password = 'admin@123';
    await admin.save(); // triggers the bcrypt pre-save hook

    console.log('✅ Admin password updated to: admin@123');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating admin:', error);
    process.exit(1);
  }
};

updateAdmin();