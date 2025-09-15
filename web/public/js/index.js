// API base from meta/localStorage, default to same-origin (works with Vercel rewrites)
const META_API = document.querySelector('meta[name="api-base"]')?.getAttribute('content') || '';
const META_WEB_ROOT = document.querySelector('meta[name="web-root"]')?.getAttribute('content') || '';
const LS_API = localStorage.getItem('apiBase') || '';
// Prefer localStorage override, then explicit meta api-base, then web-root, else same-origin
let API_BASE = (LS_API || META_API || META_WEB_ROOT || window.location.origin || '').replace(/\/$/,'');

function joinUrl(base, path){
	if (!base || base === window.location.origin){
		return path; // same-origin; rely on rewrites
	}
	return `${base}${path}`;
}

function apiFetch(path, init){
	const url = joinUrl(API_BASE, path);
	return fetch(url, init).then(async r=>{
		const ct = r.headers.get('content-type')||'';
		const body = ct.includes('application/json') ? await r.json() : await r.text();
		if (!r.ok){
			const msg = (body && body.message) || (typeof body==='string'? body : 'Request failed');
			throw new Error(`${msg} [${r.status}]`);
		}
		return body;
	});
}

// Expose quick helper to set API base at runtime (optional)
window.setApiBase = function(){
	const cur = localStorage.getItem('apiBase') || API_BASE || '';
	const next = prompt('Enter API base (leave blank for same-origin)', cur);
	if (next !== null){
		if (next.trim()) localStorage.setItem('apiBase', next.replace(/\/$/,''));
		else localStorage.removeItem('apiBase');
		alert('API base saved. Reloading...');
		location.reload();
	}
};


const API = {
	auth: {
		login: (email, password) => apiFetch('/api/auth/login', {
			method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
		}),
		register: (email, password) => apiFetch('/api/auth/register', {
			method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
		})
	},
	classes: {
		list: () => apiFetch('/api/classes', { headers: authHeader() }),
		create: (name) => apiFetch('/api/classes', { method:'POST', headers:{ ...authHeader(), 'Content-Type':'application/json' }, body: JSON.stringify({ name }) })
	}
};

// Hook up Class nav link to last opened class id if present
(function(){
	const link = document.getElementById('classNav');
	if (!link) return;
	const lastId = localStorage.getItem('lastClassId');
	if (lastId) link.href = `./class.html?id=${lastId}`;
})();


function authHeader(){
    const t = localStorage.getItem('jwt');
    return t ? { Authorization: `Bearer ${t}` } : {};
}


const authCard = document.getElementById('authCard');
const dash = document.getElementById('dash');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const classList = document.getElementById('classList');
const newClassBtn = document.getElementById('newClassBtn');


function showAuth(){ authCard.classList.remove('hidden'); dash.classList.add('hidden'); }
function showDash(){ authCard.classList.add('hidden'); dash.classList.remove('hidden'); loadClasses(); }


function init(){
    if (localStorage.getItem('jwt')) showDash(); else showAuth();
}


// enhance logout to emit event
logoutBtn?.addEventListener('click', ()=>{ localStorage.removeItem('jwt'); document.dispatchEvent(new Event('auth:loggedout')); showAuth(); });


// Wrap login/register to handle thrown errors
loginForm?.addEventListener('submit', async (e)=>{
	e.preventDefault();
	const email = document.getElementById('email').value;
	const password = document.getElementById('password').value;
	try{
		const res = await API.auth.login(email, password);
		if (res.token){ localStorage.setItem('jwt', res.token); document.dispatchEvent(new Event('auth:loggedin')); showDash(); }
	}catch(err){ alert(err.message || 'Login failed'); }
});

registerForm?.addEventListener('submit', async (e)=>{
	e.preventDefault();
	const email = document.getElementById('rEmail').value;
	const password = document.getElementById('rPassword').value;
	try{
		const reg = await API.auth.register(email, password);
		if (reg.id){
			const login = await API.auth.login(email, password);
			if (login.token){ localStorage.setItem('jwt', login.token); document.dispatchEvent(new Event('auth:loggedin')); showDash(); }
		}
	}catch(err){ alert(err.message || 'Register failed'); }
});


// Nav: mark active link
(function(){
	const links = document.querySelectorAll('.nav a');
	const path = location.pathname.split('/').pop() || 'index.html';
	links.forEach(a=>{
		const href = a.getAttribute('href');
		if (!href) return;
		const name = href.split('/').pop();
		if (name === path) a.classList.add('active');
	});
})();

// Fix class open links to static file path
const _origLoadClasses = typeof loadClasses === 'function' ? loadClasses : null;
async function loadClasses(){
	try {
		const items = await API.classes.list();
		classList.innerHTML = '';
		(items||[]).forEach(c => {
			const li = document.createElement('li');
			li.className = 'class-item';
			li.innerHTML = `<div><strong>${c.name}</strong><div class="subtle">Tables: ${c.tables?.length||0} • Students: ${c.students?.length||0}</div></div>
			<div class="row gap"><a href="./class.html?id=${c._id}" class="btn-min">Open</a></div>`;
			classList.appendChild(li);
		});
	} catch (e) {
		alert(e.message || 'Failed to load classes');
	}
}


newClassBtn?.addEventListener('click', async ()=>{
    const name = prompt('Class name');
    if (!name) return;
    try {
        const c = await API.classes.create(name);
        if (c._id) loadClasses();
    } catch (e) {
        alert(e.message || 'Failed to create class');
    }
});


init();


// --- UI enhancements appended ---
(function(){
	function animateChildren(container){
		if(!container) return;
		const children = Array.from(container.children);
		children.forEach((el, i)=>{
			el.style.willChange = 'transform,opacity';
			el.style.transition = 'transform .28s ease, opacity .28s ease, box-shadow .2s ease';
			el.style.transform = 'translateY(8px)';
			el.style.opacity = '0';
			requestAnimationFrame(()=>{
				setTimeout(()=>{
					el.style.transform = 'translateY(0)';
					el.style.opacity = '1';
				}, 20 + i*30);
			});
		});
	}

	function fadeIn(el){
		if(!el) return;
		el.style.willChange = 'transform,opacity';
		el.style.transition = 'transform .25s ease, opacity .25s ease';
		el.style.transform = 'translateY(6px)';
		el.style.opacity = '0';
		requestAnimationFrame(()=>{
			el.style.transform = 'translateY(0)';
			el.style.opacity = '1';
		});
	}

	// Observe class list for dynamic updates
	const _classList = document.getElementById('classList');
	if (_classList){
		const obs = new MutationObserver((muts)=>{
			if (muts.some(m=>m.addedNodes.length)) animateChildren(_classList);
		});
		obs.observe(_classList, { childList:true });
	}

	// Fade in cards when they become visible
	const authCardEl = document.getElementById('authCard');
	const dashEl = document.getElementById('dash');
	[authCardEl, dashEl].forEach(sec=>{
		if (!sec) return;
		const io = new IntersectionObserver((entries)=>{
			entries.forEach(e=>{ if (e.isIntersecting) fadeIn(sec); });
		},{ root:null, threshold:.4 });
		io.observe(sec);
	});

	// Micro ripple for primary buttons
	document.addEventListener('click', (e)=>{
		const target = e.target.closest('button, .btn-min');
		if (!target) return;
		target.style.transform = 'scale(.98)';
		setTimeout(()=>{ target.style.transform = ''; }, 120);
	}, true);
})();

// Disable nav links until authenticated
(function(){
	const hasToken = !!localStorage.getItem('jwt');
	const studentsNav = document.getElementById('studentsNav');
	const classNav = document.getElementById('classNav');
	const logoutBtn = document.getElementById('logoutBtn');
	function setDisabled(disabled){
		[studentsNav, classNav, logoutBtn].forEach(el=>{
			if (!el) return;
			if (disabled){ el.classList.add('disabled'); }
			else { el.classList.remove('disabled'); }
		});
	}
	setDisabled(!hasToken);
	// Prevent clicks when disabled
	document.addEventListener('click', (e)=>{
		const a = e.target.closest('.nav a, .nav .danger');
		if (a && a.classList.contains('disabled')){
			e.preventDefault();
			e.stopPropagation();
		}
	}, true);
	// When we log in, enable
	document.addEventListener('auth:loggedin', ()=> setDisabled(false));
})();

// after successful login, emit event
(function(){
	const _loginSubmit = (formHandler)=>formHandler;
})();

// password eye toggle
(function(){
	const btn = document.getElementById('togglePwd');
	const input = document.getElementById('password');
	if (!btn || !input) return;
	btn.addEventListener('click', ()=>{
		const isPwd = input.getAttribute('type') === 'password';
		input.setAttribute('type', isPwd ? 'text' : 'password');
		btn.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
	});
})();

// password eye toggle for register
(function(){
	const btn = document.getElementById('togglePwdReg');
	const input = document.getElementById('rPassword');
	if (!btn || !input) return;
	btn.addEventListener('click', ()=>{
		const isPwd = input.getAttribute('type') === 'password';
		input.setAttribute('type', isPwd ? 'text' : 'password');
		btn.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
	});
})();