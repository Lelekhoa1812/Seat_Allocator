import { SeatLogic } from './logic.js';


function authHeader(){
	const t = localStorage.getItem('jwt');
	if (!t) { window.location.href = '/'; }
	return { Authorization: `Bearer ${t}` };
}


document.getElementById('logoutBtn')?.addEventListener('click', ()=>{ localStorage.removeItem('jwt'); window.location.href='/'; });


// API base support (mirrors index.js)
const API_BASE = (localStorage.getItem('apiBase') || document.querySelector('meta[name="api-base"]')?.getAttribute('content') || '').replace(/\/$/,'');
function apiFetch(path, init){
	return fetch(`${API_BASE}${path}`, init).then(async r=>{
		const ct = r.headers.get('content-type')||'';
		const body = ct.includes('application/json') ? await r.json() : await r.text();
		if (!r.ok) throw new Error((body && body.message) || (typeof body==='string'? body : 'Request failed'));
		return body;
	});
}


// Define API globally to avoid temporal dead zone issues
const API = {
	students: { list: () => apiFetch('/api/students',{headers:authHeader()}) },
	classes: {
		get: (id) => apiFetch(`/api/classes/${id}`,{headers:authHeader()}),
		update: (id, payload) => apiFetch(`/api/classes/${id}`,{method:'PUT',headers:{...authHeader(),'Content-Type':'application/json'},body:JSON.stringify(payload)}),
		allocate: (id, opts) => apiFetch(`/api/classes/${id}/allocate`,{method:'POST', headers:{...authHeader(),'Content-Type':'application/json'}, body: JSON.stringify(opts||{})})
	}
};
window.API = API;


const url = new URL(window.location.href);
let classId = url.searchParams.get('id') || localStorage.getItem('lastClassId');
if (!classId){
	alert('No classroom selected. Please open a class from the dashboard.');
	window.location.href = '/';
}


const classTitle = document.getElementById('classTitle');
const layoutEl = document.getElementById('layout');
const addTableBtn = document.getElementById('addTableBtn');
const allocateBtn = document.getElementById('allocateBtn');
const refreshBtn = document.getElementById('refreshBtn');
const availableStudents = document.getElementById('availableStudents');


let currentClass = null;
let allStudents = [];


// override renderLayout to include delete icon
function renderLayout(){
	layoutEl.innerHTML='';
	(currentClass.tables||[]).sort((a,b)=>a.row-b.row||a.col-b.col).forEach(t=>{
		const el = document.createElement('div');
		el.className='table';
		el.draggable=true;
		el.dataset.tid = t._id;
		el.innerHTML = `<div class="head">
		<strong>Table ${t.row+1}-${t.col+1}</strong>
		<div class="row gap">
			<button class="btn-min" data-change="${t._id}">Seats: ${t.seats}</button>
			<button class="icon-btn" title="Delete table" data-del="${t._id}">${binSvg()}</button>
		</div>
		</div>
		<div class="seats">${Array.from({length:t.seats}).map((_,i)=>`<div class="seat"><span class="tag">${i+1}</span></div>`).join('')}</div>`;

		el.querySelector('[data-change]')?.addEventListener('click', async ()=>{
			const newSeats = ((t.seats % 3)+1);
			t.seats = newSeats;
			await API.classes.update(currentClass._id, { name: currentClass.name, students: currentClass.students.map(s=>s._id), tables: currentClass.tables });
			renderLayout();
		});

		el.querySelector('[data-del]')?.addEventListener('click', async ()=>{
			if (!confirm('Delete this table?')) return;
			currentClass.tables = currentClass.tables.filter(x=>x._id!==t._id);
			await API.classes.update(currentClass._id, { name: currentClass.name, students: currentClass.students.map(s=>s._id), tables: currentClass.tables });
			renderLayout();
		});

		el.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', t._id); });
		el.addEventListener('dragover', e=> e.preventDefault());
		el.addEventListener('drop', async (e)=>{
			e.preventDefault();
			const fromId = e.dataTransfer.getData('text/plain');
			const toId = t._id;
			if (fromId===toId) return;
			const A = currentClass.tables.find(x=>x._id===fromId);
			const B = currentClass.tables.find(x=>x._id===toId);
			[A.row, B.row] = [B.row, A.row];
			[A.col, B.col] = [B.col, A.col];
			await API.classes.update(currentClass._id, { name: currentClass.name, students: currentClass.students.map(s=>s._id), tables: currentClass.tables });
			renderLayout();
		});

		layoutEl.appendChild(el);
	});
}


function renderStudents(){
availableStudents.innerHTML='';
	allStudents.forEach(s=>{
		const li=document.createElement('li');
		const checked = currentClass.students.find(x=>x._id===s._id) ? 'checked' : '';
		li.innerHTML=`<label class="row gap center"><input type="checkbox" value="${s._id}" ${checked}/> ${s.name} ${s.extId?`<span class="badge">${s.extId}</span>`:''}</label>`;
		li.querySelector('input').addEventListener('change', async (e)=>{
			if (e.target.checked){ currentClass.students.push(s); }
			else { currentClass.students = currentClass.students.filter(x=>x._id!==s._id); }
			await API.classes.update(currentClass._id, { name: currentClass.name, students: currentClass.students.map(x=>x._id), tables: currentClass.tables });
		});
		availableStudents.appendChild(li);
	});
}


// Modal-based table creation
const tableModal = document.getElementById('tableModal');
const tableForm = document.getElementById('tableForm');
const tRow = document.getElementById('tRow');
const tCol = document.getElementById('tCol');
const tSeats = document.getElementById('tSeats');
const cancelTable = document.getElementById('cancelTable');

addTableBtn?.addEventListener('click', ()=>{
	// set sensible defaults
	const last = (currentClass.tables||[]).slice(-1)[0];
	tRow.value = String(last ? last.row : 0);
	tCol.value = String(last ? (last.col+1) : 0);
	tSeats.value = String(2);
	tableModal.classList.remove('hidden');
});

cancelTable?.addEventListener('click', ()=> tableModal.classList.add('hidden'));

tableForm?.addEventListener('submit', async (e)=>{
	e.preventDefault();
	const row = Math.max(0, parseInt(tRow.value||'0'))|0;
	const col = Math.max(0, parseInt(tCol.value||'0'))|0;
	const seats = Math.min(3, Math.max(1, parseInt(tSeats.value||'2')))|0;
	currentClass.tables.push({ row, col, seats });
	await API.classes.update(currentClass._id, { name: currentClass.name, students: currentClass.students.map(s=>s._id), tables: currentClass.tables });
	tableModal.classList.add('hidden');
	renderLayout();
});


allocateBtn?.addEventListener('click', async ()=>{
	// ensure backend has latest students selection before allocate
	await API.classes.update(currentClass._id, { name: currentClass.name, students: currentClass.students.map(s=>s._id), tables: currentClass.tables });
	const res = await API.classes.allocate(currentClass._id, { strategy: 'spread_groups', frontWeight: 1 });
	if (!res || !res.tables){ alert('Allocation failed'); return; }
	applyAllocation(res.tables);
});


refreshBtn?.addEventListener('click', ()=> renderLayout());


function applyAllocation(assignedTables){
	// map: tableId -> assigned student names
	const nameById = new Map(allStudents.map(s=>[s._id,s.name]));
	const tableDivs = [...layoutEl.querySelectorAll('.table')];
	tableDivs.forEach(div=>{
		const tid = div.dataset.tid;
		const data = assignedTables.find(t=>t.id===tid);
		const seatEls = div.querySelectorAll('.seat');
		seatEls.forEach((seatEl, idx)=>{
			seatEl.classList.remove('assigned');
			seatEl.innerHTML = `<span class="tag">${idx+1}</span>`;
			if (data && data.assigned[idx]){
				const sid = data.assigned[idx];
				seatEl.classList.add('assigned');
				seatEl.innerHTML = `<span class="tag">${nameById.get(sid) || sid}</span>`;
			}
		});
	});
}


async function reload(){
	currentClass = await API.classes.get(classId);
	if (!currentClass?._id){ alert('Class not found'); window.location.href='/'; return; }
	classTitle.textContent = currentClass.name;
	renderLayout();
	allStudents = await API.students.list();
	renderStudents();
}


reload();


// --- UI enhancements appended ---
(function(){
	const layout = document.getElementById('layout');
	function staggerIn(){
		if(!layout) return;
		const items = Array.from(layout.children);
		items.forEach((el,i)=>{
			el.style.willChange = 'transform,opacity';
			el.style.transition = 'transform .24s ease, opacity .24s ease, box-shadow .2s ease';
			el.style.transform = 'translateY(8px)';
			el.style.opacity = '0';
			setTimeout(()=>{
				el.style.transform = 'translateY(0)';
				el.style.opacity = '1';
			}, 20 + i*35);
		});
	}
	const mo = new MutationObserver(m=>{
		if (m.some(x=>x.addedNodes.length)) staggerIn();
	});
	if (layout) mo.observe(layout, { childList:true });

	// Pulse assigned seats after allocation
	const seatPulse = ()=>{
		if (!layout) return;
		layout.querySelectorAll('.seat.assigned').forEach((s,i)=>{
			s.classList.remove('pulse');
			void s.offsetWidth; // reflow to restart animation
			s.classList.add('pulse');
		});
	};

	// Hook into allocation by observing seat text changes
	const textObserver = new MutationObserver((muts)=>{
		if (muts.some(m=>m.type==='childList')) seatPulse();
	});
	if (layout) textObserver.observe(layout, { subtree:true, childList:true });

	// Drag visual hint
	document.addEventListener('dragstart', (e)=>{
		const t = e.target.closest('.table');
		if (!t) return;
		t.style.opacity = '.8';
		t.style.scale = '1.02';
	});
	document.addEventListener('dragend', (e)=>{
		const t = e.target.closest('.table');
		if (!t) return;
		t.style.opacity = '';
		t.style.scale = '';
	});
})();

// Track last opened class for navbar convenience
(function(){
	try{
		const url = new URL(window.location.href);
		const classId = url.searchParams.get('id');
		if (classId) localStorage.setItem('lastClassId', classId);
	}catch{}
})();

// Nav: mark active link
(function(){
	const links = document.querySelectorAll('.nav a');
	const path = location.pathname;
	links.forEach(a=>{
		const href = a.getAttribute('href');
		if (!href) return;
		if (href === '/' && path === '/') a.classList.add('active');
		if (href === '/class' && path.startsWith('/class')) a.classList.add('active');
		if (href === '/students' && path.startsWith('/students')) a.classList.add('active');
	});
})();

// Add bin icon svg helper
function binSvg(){return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3h6m-9 4h12m-1 0-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7m3 4v7m6-7v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'}