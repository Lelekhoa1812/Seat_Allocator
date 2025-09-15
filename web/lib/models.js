import mongoose from 'mongoose';

function ensureModel(name, schemaDef){
	try{ return mongoose.model(name); }
	catch{
		const schema = new mongoose.Schema(schemaDef.schema, schemaDef.options||{});
		if (schemaDef.extend) schemaDef.extend(schema);
		return mongoose.model(name, schema);
	}
}

export const Teacher = ensureModel('Teacher', {
	schema: { email: { type:String, required:true, unique:true }, passwordHash: { type:String, required:true } },
	options: { timestamps:true }
});

export const Student = ensureModel('Student', {
	schema: { name: { type:String, required:true }, extId:{ type:String }, teacher: { type: mongoose.Schema.Types.ObjectId, ref:'Teacher', index:true } },
	options: { timestamps:true }
});

export const Group = ensureModel('Group', {
	schema: { name:{ type:String, required:true }, tag:{ type:String }, members:[{ type: mongoose.Schema.Types.ObjectId, ref:'Student' }], teacher: { type: mongoose.Schema.Types.ObjectId, ref:'Teacher', index:true } },
	options: { timestamps:true }
});

const TableSchema = new mongoose.Schema({ row:Number, col:Number, seats:{ type:Number, min:1, max:3, default:2 } }, { _id:true });
export const ClassModel = (function(){
	try{ return mongoose.model('Class'); }
	catch{
		const schema = new mongoose.Schema({ name:{ type:String, required:true }, students:[{ type: mongoose.Schema.Types.ObjectId, ref:'Student' }], tables:[TableSchema], teacher:{ type: mongoose.Schema.Types.ObjectId, ref:'Teacher', index:true } }, { timestamps:true });
		return mongoose.model('Class', schema);
	}
})();
