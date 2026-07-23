import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farm_marketplace');
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@farm.com' });
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      await mongoose.connection.close();
      return;
    }

    // Create admin user
    await User.create({
      name: 'Admin',
      email: 'admin@farm.com',
      password: 'admin123',
      mobile: '0000000000',
      address: 'Admin Office',
      role: 'admin',
      isVerified: true,
    });

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@farm.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️ Please change the password after first login');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
