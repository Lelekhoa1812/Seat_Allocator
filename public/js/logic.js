// Seating allocation logic usable by both Node (server) and browser (client)
// Exports:
// - named export allocateSeats(students, groups, tables)
// - named export SeatLogic with allocateSeats
// - default export SeatLogic

/**
 * Allocate students to tables.
 * @param {Array<{id:string,name:string}>} students
 * @param {Array<{id:string,name:string,memberIds:string[]}>} groups
 * @param {Array<{id:string,row:number,col:number,seats:number}>} tables
 * @returns {{ tables: Array<{id:string,row:number,col:number,seats:number,assigned:string[]}> }}
 */
export function allocateSeats(students = [], groups = [], tables = []){
	const totalSeats = tables.reduce((sum, t) => sum + (t.seats||0), 0);
	if (students.length > totalSeats) {
		throw new Error('Not enough seats for all students');
	}

	// Prepare tables with assigned arrays and stable order by row/col
	const orderedTables = [...tables]
		.map(t => ({ id: String(t.id), row: t.row|0, col: t.col|0, seats: t.seats|0, assigned: [] }))
		.sort((a,b)=> a.row - b.row || a.col - b.col);

	const tableById = new Map(orderedTables.map(t => [t.id, t]));
	const allStudentIds = new Set(students.map(s => String(s.id)));

	// Helper: choose a table with remaining capacity, preferring more remaining seats, then row/col
	function pickBestTable(){
		let best = null;
		for (const t of orderedTables){
			const remaining = t.seats - t.assigned.length;
			if (remaining <= 0) continue;
			if (!best) { best = { t, remaining }; continue; }
			if (remaining > best.remaining) best = { t, remaining };
			else if (remaining === best.remaining){
				if (t.row < best.t.row || (t.row === best.t.row && t.col < best.t.col)) best = { t, remaining };
			}
		}
		return best?.t || null;
	}

	// Place grouped students first to keep them close when possible
	const placed = new Set();
	for (const g of groups){
		const members = (g?.memberIds||[]).map(String).filter(id => allStudentIds.has(id));
		for (const sid of members){
			if (placed.has(sid)) continue;
			const t = pickBestTable();
			if (!t) throw new Error('No available seat while placing group members');
			t.assigned.push(sid);
			placed.add(sid);
		}
	}

	// Place remaining students
	for (const s of students){
		const sid = String(s.id);
		if (placed.has(sid)) continue;
		const t = pickBestTable();
		if (!t) throw new Error('No seat available for remaining student');
		t.assigned.push(sid);
		placed.add(sid);
	}

	return { tables: orderedTables.map(t => ({ id: t.id, row: t.row, col: t.col, seats: t.seats, assigned: [...t.assigned] })) };
}

export const SeatLogic = { allocateSeats };
export default SeatLogic;