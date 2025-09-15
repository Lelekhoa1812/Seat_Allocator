import mongoose from 'mongoose';


const TableSchema = new mongoose.Schema({
row: Number,
col: Number,
seats: { type: Number, min: 1, max: 3, default: 2 }
}, { _id: true });


const ClassSchema = new mongoose.Schema({
name: { type: String, required: true },
students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
tables: [TableSchema] // arrangement grid
}, { timestamps: true });
// Ownership
ClassSchema.add({ teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', index: true } });


export default mongoose.model('Class', ClassSchema);