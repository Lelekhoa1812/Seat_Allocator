import mongoose from 'mongoose';


const StudentSchema = new mongoose.Schema({
name: { type: String, required: true },
extId: { type: String }, // optional external ID
teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', index: true }
}, { timestamps: true });


export default mongoose.model('Student', StudentSchema);