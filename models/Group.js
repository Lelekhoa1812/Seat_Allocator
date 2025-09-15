import mongoose from 'mongoose';


const GroupSchema = new mongoose.Schema({
name: { type: String, required: true },
tag: { type: String },
members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
}, { timestamps: true });
// Ownership
GroupSchema.add({ teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', index: true } });


export default mongoose.model('Group', GroupSchema);