import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixAgentRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    // Find all users with role "agent" (invalid role not in schema enum)
    const agentUsers = await mongoose.connection.db
      .collection('users')
      .find({ role: 'agent' })
      .toArray();

    console.log(`\n=== Users with invalid role="agent" (${agentUsers.length}) ===`);
    agentUsers.forEach((u: any) => {
      console.log(`- ID: ${u._id} | Name: ${u.name} | Email: ${u.email}`);
    });

    if (agentUsers.length === 0) {
      console.log('\n✅ No invalid role="agent" records found. Nothing to migrate.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Migrate invalid role="agent" to "buyer" (the schema default role)
    const result = await mongoose.connection.db
      .collection('users')
      .updateMany(
        { role: 'agent' },
        { $set: { role: 'buyer' } }
      );

    console.log(`\n✅ Migrated ${result.modifiedCount} users from role="agent" to role="buyer"`);

    // Verify the migration
    const remainingAgents = await mongoose.connection.db
      .collection('users')
      .find({ role: 'agent' })
      .toArray();
    
    console.log(`\n=== Remaining role="agent" records: ${remainingAgents.length} ===`);

    // Show updated role distribution
    const roleCounts = await mongoose.connection.db
      .collection('users')
      .aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
      .toArray();
    
    console.log(`\n=== Updated role distribution ===`);
    roleCounts.forEach((r: any) => {
      console.log(`- ${r._id}: ${r.count}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error migrating roles:', error);
    process.exit(1);
  }
};

fixAgentRoles();