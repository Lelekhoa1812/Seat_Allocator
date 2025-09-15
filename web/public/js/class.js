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
		allocate: (id) => apiFetch(`/api/classes/${id}/allocate`,{method:'POST', headers:authHeader()})
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


function renderLayout(){
	layoutEl.innerHTML='';
	(currentClass.tables||[]).sort((a,b)=>a.row-b.row||a.col-b.col).forEach(t=>{
		const el = document.createElement('div');
		el.className='table';
		el.draggable=true;
		el.dataset.tid = t._id;
		el.innerHTML = `<div class="head">
		<strong>Table ${t.row+1}-${t.col+1}</strong>
		<button class="btn-min" data-change="${t._id}">Seats: ${t.seats}</button>
		</div>
		<div class="seats">${Array.from({length:t.seats}).map((_,i)=>`<div class="seat"><span class="tag">${i+1}</span></div>`).join('')}</div>`;


		el.querySelector('[data-change]')?.addEventListener('click', async ()=>{
			const newSeats = ((t.seats % 3)+1); // 1→2→3→1
			t.seats = newSeats;
			await API.classes.update(currentClass._id, { name: currentClass.name, students: currentClass.students.map(s=>s._id), tables: currentClass.tables });
			renderLayout();
		});


		el.addEventListener('dragstart', e=>{
			e.dataTransfer.setData('text/plain', t._id);
		});
		el.addEventListener('dragover', e=> e.preventDefault());
		el.addEventListener('drop', async (e)=>{
			e.preventDefault();
			const fromId = e.dataTransfer.getData('text/plain');
			const toId = t._id;
			if (fromId===toId) return;
			// swap row/col
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


addTableBtn?.addEventListener('click', async ()=>{
	const row = parseInt(prompt('Row index (0-based)?', String(currentClass.tables.length? currentClass.tables.at(-1).row : 0)))||0;
	const col = parseInt(prompt('Col index (0-based)?', '0'))||0;
	const seats = Math.min(3, Math.max(1, parseInt(prompt('Seats (1–3)?','2')||'2')));
	currentClass.tables.push({ row, col, seats });
	await API.classes.update(currentClass._id, { name: currentClass.name, students: currentClass.students.map(s=>s._id), tables: currentClass.tables });
	await reload();
});


allocateBtn?.addEventListener('click', async ()=>{
	const res = await API.classes.allocate(currentClass._id);
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