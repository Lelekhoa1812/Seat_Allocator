// API base from meta/localStorage (same-origin on Next)
const API_BASE = (localStorage.getItem('apiBase') || document.querySelector('meta[name="api-base"]')?.getAttribute('content') || '').replace(/\/$/,'');
function apiFetch(path, init){
	return fetch(`${API_BASE}${path}`, init).then(async r=>{
		const ct = r.headers.get('content-type')||'';
		const body = ct.includes('application/json') ? await r.json() : await r.text();
		if (!r.ok) throw new Error((body && body.message) || (typeof body==='string'? body : 'Request failed'));
		return body;
	});
}

function authHeader(){
	const t = localStorage.getItem('jwt');
	if (!t) { window.location.href = '/'; }
	return { Authorization: `Bearer ${t}` };
}

const API = {
	students: {
		list: () => apiFetch('/api/students',{ headers: authHeader() }),
		create: (name, extId) => apiFetch('/api/students',{ method:'POST', headers:{...authHeader(),'Content-Type':'application/json'}, body: JSON.stringify({ name, extId }) }),
		update: (id, payload) => apiFetch(`/api/students/${id}`,{ method:'PUT', headers:{...authHeader(),'Content-Type':'application/json'}, body: JSON.stringify(payload) }),
		delete: (id) => apiFetch(`/api/students/${id}`,{ method:'DELETE', headers:authHeader() })
	},
	groups: {
		list: () => apiFetch('/api/groups',{ headers:authHeader() }),
		save: (payload, id) => id ? apiFetch(`/api/groups/${id}`,{ method:'PUT', headers:{...authHeader(),'Content-Type':'application/json'}, body: JSON.stringify(payload) }) : apiFetch('/api/groups',{ method:'POST', headers:{...authHeader(),'Content-Type':'application/json'}, body: JSON.stringify(payload) }),
		del: (id) => apiFetch(`/api/groups/${id}`,{ method:'DELETE', headers:authHeader() })
	}
};

// Elements
const studentForm = document.getElementById('studentForm');
const studentList = document.getElementById('studentList');
const newGroupBtn = document.getElementById('newGroupBtn');
const groupPanel = document.getElementById('groupPanel');
const modal = document.getElementById('modal');
const cancelModal = document.getElementById('cancelModal');
const groupForm = document.getElementById('groupForm');
const groupName = document.getElementById('groupName');
const groupTag = document.getElementById('groupTag');
const memberChecks = document.getElementById('memberChecks');
let editingGroupId = null;

async function loadStudents(){
	const students = await API.students.list();
	studentList.innerHTML = '';
	students.forEach(s=>{
		const li = document.createElement('li');
		li.innerHTML = `<div class="row between center"><div>${s.name} ${s.extId?`<span class=\"badge\">${s.extId}</span>`:''}</div><div class="row gap"><button class="btn-min" data-edit="${s._id}">Edit</button><button class="btn-min danger" data-del="${s._id}">Delete</button></div></div>`;
		li.querySelector('[data-del]')?.addEventListener('click', async ()=>{
			if (confirm('Delete student?')){ await API.students.delete(s._id); await loadStudents(); }
		});
		li.querySelector('[data-edit]')?.addEventListener('click', async ()=>{
			const name = prompt('New name', s.name) || s.name;
			const extId = prompt('New ID (optional)', s.extId||'') || '';
			await API.students.update(s._id, { name, extId });
			await loadStudents();
		});
		studentList.appendChild(li);
	});
}

async function loadGroups(){
	const students = await API.students.list();
	const groups = await API.groups.list();
	groupPanel.innerHTML = '';
	groups.forEach(g=>{
		const card=document.createElement('div');
		card.className='card';
		const mem = g.members.map(m=>m.name).join(', ')||'<i>no members</i>';
		card.innerHTML = `<div class="row between center">
			<div>
				<div><strong>${g.name}</strong> ${g.tag?`<span class=\"badge\">${g.tag}</span>`:''}</div>
				<div class="subtle">${mem}</div>
			</div>
			<div class="row gap">
				<button class="btn-min" data-edit="${g._id}">Edit</button>
				<button class="btn-min danger" data-del="${g._id}">Delete</button>
			</div>
		</div>`;
		card.querySelector('[data-edit]')?.addEventListener('click', ()=> openGroupModal(g, students));
		card.querySelector('[data-del]')?.addEventListener('click', async ()=>{
			if (confirm('Delete group?')){ await API.groups.del(g._id); loadGroups(); }
		});
		groupPanel.appendChild(card);
	});
}

function openGroupModal(g, students){
	editingGroupId = g? g._id : null;
	groupName.value = g? g.name : '';
	groupTag.value = g? (g.tag||'') : '';
	memberChecks.innerHTML='';
	students.forEach(s=>{
		const id = `chk_${s._id}`;
		const wrap = document.createElement('label');
		wrap.innerHTML = `<input type="checkbox" id="${id}" value="${s._id}" ${g && g.members.find(m=>m._id===s._id)?'checked':''}/> ${s.name}`;
		memberChecks.appendChild(wrap);
	});
	modal.classList.remove('hidden');
}

newGroupBtn?.addEventListener('click', async ()=>{
	const students = await API.students.list();
	openGroupModal(null, students);
});

cancelModal?.addEventListener('click', ()=> modal.classList.add('hidden'));

studentForm?.addEventListener('submit', async (e)=>{
	e.preventDefault();
	const name = document.getElementById('studentName').value.trim();
	if (!name) return;
	const extId = document.getElementById('studentExtId').value.trim();
	await API.students.create(name, extId||undefined);
	studentForm.reset();
	await loadStudents();
});

groupForm?.addEventListener('submit', async (e)=>{
	e.preventDefault();
	const name = groupName.value.trim();
	if (!name) return;
	const tag = groupTag.value.trim();
	const memberIds = [...memberChecks.querySelectorAll('input[type="checkbox"]:checked')].map(i=>i.value);
	const payload = { name, tag: tag||undefined, memberIds };
	await API.groups.save(payload, editingGroupId);
	modal.classList.add('hidden');
	await loadGroups();
});

async function init(){
	await loadStudents();
	await loadGroups();
}

init();

// --- UI enhancements appended ---
(function(){
	const studentList = document.getElementById('studentList');
	const modal = document.getElementById('modal');
	const modalContent = modal?.querySelector('.modal-content');
	const groupPanel = document.getElementById('groupPanel');

	function animateList(container){
		if(!container) return;
		Array.from(container.children).forEach((el,i)=>{
			el.style.willChange='transform,opacity';
			el.style.transition='transform .22s ease, opacity .22s ease, box-shadow .2s ease';
			el.style.transform='translateY(8px)';
			el.style.opacity='0';
			setTimeout(()=>{ el.style.transform='translateY(0)'; el.style.opacity='1'; }, 16 + i*25);
		});
	}
	const mo1 = new MutationObserver(m=>{ if(m.some(x=>x.addedNodes.length)) animateList(studentList); });
	if (studentList) mo1.observe(studentList,{childList:true});
	const mo2 = new MutationObserver(m=>{ if(m.some(x=>x.addedNodes.length)) animateList(groupPanel); });
	if (groupPanel) mo2.observe(groupPanel,{childList:true});

	// Modal open animation retrigger
	document.addEventListener('click', (e)=>{
		const openers = e.target.closest('#newGroupBtn, [data-edit]');
		if (!openers || !modalContent) return;
		requestAnimationFrame(()=>{
			modalContent.style.willChange='transform,opacity';
			modalContent.style.transition='transform .22s ease, opacity .22s ease';
			modalContent.style.transform='translateY(8px) scale(.98)';
			modalContent.style.opacity='0';
			requestAnimationFrame(()=>{
				modalContent.style.transform='translateY(0) scale(1)';
				modalContent.style.opacity='1';
			});
		});
	}, true);

	// Micro press on small buttons
	document.addEventListener('click', (e)=>{
		const btn = e.target.closest('.btn-min');
		if (!btn) return;
		btn.style.transform='translateY(1px)';
		setTimeout(()=> btn.style.transform='', 120);
	}, true);
})();

// Nav: mark active link
(function(){
	const links = document.querySelectorAll('.nav a');
	const path = location.pathname.split('/').pop() || 'student.html';
	links.forEach(a=>{
		const href = a.getAttribute('href');
		if (!href) return;
		const name = href.split('/').pop();
		if (name === path) a.classList.add('active');
	});
})();

// Hook up Class nav link to last opened class id if present
(function(){
	const link = document.getElementById('classNav');
	if (!link) return;
	const lastId = localStorage.getItem('lastClassId');
	if (lastId) link.href = `./class.html?id=${lastId}`;
})();