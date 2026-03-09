/* ── Firebase Init ─────────────────────────────────────────────────── */
const firebaseConfig = {
    apiKey: "AIzaSyA2u3jsutbNafWDY3CE-J6XnpTdjD5Cjw0",
    authDomain: "iganzeprotocol-form.firebaseapp.com",
    projectId: "iganzeprotocol-form",
    storageBucket: "iganzeprotocol-form.firebasestorage.app",
    messagingSenderId: "468067088842",
    appId: "1:468067088842:web:6257e3abf04cd909f07733"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* Global Memory for Edits */
let currentRegistrations = {};

/* Logo as base64 (so it works in print popups too) */
let logoBase64 = '';

async function loadLogoAsBase64() {
    try {
        const res = await fetch('logo.jpeg');
        const blob = await res.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => { logoBase64 = reader.result; resolve(); };
            reader.readAsDataURL(blob);
        });
    } catch (_) { /* logo not critical, skip silently */ }
}

/* ── Auth Guard ────────────────────────────────────────────────────── */
if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = 'admin-login.html';
}

/* ── Load on Start ─────────────────────────────────────────────────── */
loadLogoAsBase64().then(() => loadRegistrations());

/* ── Main Loader ───────────────────────────────────────────────────── */
async function loadRegistrations() {
    const loadingEl = document.getElementById('loadingState');
    const errorEl = document.getElementById('errorState');
    const registrationsEl = document.getElementById('registrations');
    const totalCountEl = document.getElementById('totalCount');
    const todayCountEl = document.getElementById('todayCount');
    const countBadgeEl = document.getElementById('countBadge');

    // reset UI
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    registrationsEl.style.display = 'none';
    registrationsEl.innerHTML = '';

    // clear memory
    currentRegistrations = {};

    try {
        const snapshot = await db
            .collection('registrations')
            .orderBy('timestamp', 'desc')
            .get();

        loadingEl.style.display = 'none';

        const total = snapshot.size;
        totalCountEl.textContent = total;
        countBadgeEl.textContent = total;

        // Count today's registrations
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        let todayCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();

            // store in memory for editing later
            currentRegistrations[doc.id] = data;

            if (data.timestamp) {
                try {
                    const d = data.timestamp.toDate();
                    d.setHours(0, 0, 0, 0);
                    if (d.getTime() === todayMidnight.getTime()) todayCount++;
                } catch (_) { }
            }
        });
        todayCountEl.textContent = todayCount;

        if (snapshot.empty) {
            registrationsEl.innerHTML = `
            <div class="state-box empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-title">No registrations yet</div>
                <p class="empty-state-desc">New submissions will appear here automatically.</p>
            </div>`;
            registrationsEl.style.display = 'block';
            return;
        }

        snapshot.forEach(doc => {
            const card = buildDocument(doc.id, doc.data());
            registrationsEl.appendChild(card);
        });

        registrationsEl.style.display = 'flex';

    } catch (err) {
        loadingEl.style.display = 'none';
        errorEl.textContent = '⚠ Error loading registrations: ' + err.message;
        errorEl.style.display = 'block';
        console.error('Firestore error:', err);
    }
}

/* ── Delete Action ─────────────────────────────────────────────────── */
async function deleteRegistration(id) {
    if (!confirm("Are you sure you want to permanently delete this registration document?")) return;

    try {
        await db.collection('registrations').doc(id).delete();
        alert('Document destroyed successfully.');
        loadRegistrations(); // Refresh list automatically
    } catch (e) {
        alert('Failed to delete: ' + e.message);
    }
}

/* ── Edit Modal Actions ────────────────────────────────────────────── */
function openEditModal(id) {
    const data = currentRegistrations[id];
    if (!data) return;

    // map data to form fields
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-fullName').value = data.fullName || '';
    document.getElementById('edit-email').value = data.email || '';
    document.getElementById('edit-phone').value = data.phone || '';
    document.getElementById('edit-purpose').value = data.purpose || '';
    document.getElementById('edit-idNumber').value = data.idNumber || '';

    // show modal
    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function saveEdits() {
    const id = document.getElementById('edit-id').value;
    const updatedData = {
        fullName: document.getElementById('edit-fullName').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        phone: document.getElementById('edit-phone').value.trim(),
        purpose: document.getElementById('edit-purpose').value.trim(),
        idNumber: document.getElementById('edit-idNumber').value.trim(),
    };

    try {
        await db.collection('registrations').doc(id).update(updatedData);
        closeModal();
        alert('Document updated successfully!');
        loadRegistrations(); // Refresh list to reflect edits
    } catch (e) {
        alert('Failed to update: ' + e.message);
    }
}


/* ── Download as PDF ──────────────────────────────────────────────── */
function downloadDocument(id) {
    const data = currentRegistrations[id];
    if (!data) return;

    const fullName = `${data.title ? data.title + ' ' : ''}${data.fullName || 'Unknown'}`;
    const na = '<span style="color:#666">N/A</span>';

    const profileSection = (data.hasImage && data.profileImage)
        ? `<div class="pdf-photo-top">
               <img src="${data.profileImage}" alt="Profile Photo" class="pdf-photo-img">
               <div><strong>Client Profile Photo</strong><br><span style="color:#888;font-size:0.8rem;">Officially Attached</span></div>
           </div>`
        : '';

    const printContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Registration — ${fullName}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:wght@600;700&display=swap');
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Inter', sans-serif; background:#fff; color:#111; padding: 48px; }
            .doc-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom: 2px dashed #ccc; }
            .doc-title { font-family:'Playfair Display',serif; font-size:2rem; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#111; margin-bottom:6px; }
            .doc-id { font-family:'Courier New',monospace; font-size:0.8rem; color:#777; }
            .doc-stamp { padding:6px 14px; border:2px solid #111; font-family:'Courier New',monospace; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; transform:rotate(3deg); display:inline-block; }
            .doc-brand { display:flex; align-items:center; gap:14px; }
            .pdf-logo { width:60px; height:60px; object-fit:contain; border-radius:6px; }
            .fieldset { display:grid; grid-template-columns:1fr 1fr; column-gap:40px; row-gap:24px; }
            .field { display:flex; flex-direction:column; }
            .field.full { grid-column:1/-1; }
            .label { font-size:0.65rem; text-transform:uppercase; letter-spacing:1.2px; color:#888; font-weight:600; margin-bottom:3px; }
            .answer { font-family:'Playfair Display',serif; font-size:1.15rem; color:#111; padding-bottom:6px; border-bottom:1px solid #ddd; min-height:30px; }
            .pdf-photo-top { display:flex; align-items:center; gap:20px; margin-bottom:28px; padding:16px; border:1px solid #eee; background:#fafafa; }
            .pdf-photo-img { width:110px; height:110px; object-fit:cover; border:3px solid #ddd; border-radius:4px; }
            .doc-footer { margin-top:48px; padding-top:16px; border-top:1px solid #eee; font-size:0.75rem; color:#aaa; text-align:center; }
            .accent-bar { height:6px; background: linear-gradient(90deg,#00e87a,#00b860); margin-bottom:24px; }
            @media print { body { padding:24px; } }
        </style>
    </head>
    <body>
        <div class="accent-bar"></div>
        <div class="doc-header">
            <div class="doc-brand">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Iganze Protocol" class="pdf-logo">` : ''}
                <div>
                    <div class="doc-title">Official Registration</div>
                </div>
            </div>
            <div class="doc-stamp">IGANZE PROTOCOL</div>
        </div>

        ${profileSection}
        <div class="fieldset">
            <div class="field full">
                <div class="label">Full Legal Name</div>
                <div class="answer">${fullName}</div>
            </div>
            <div class="field">
                <div class="label">Identification Number</div>
                <div class="answer">${data.idNumber || 'N/A'}</div>
            </div>
            <div class="field">
                <div class="label">Date of Birth</div>
                <div class="answer">${data.dob || 'N/A'}</div>
            </div>
            <div class="field">
                <div class="label">Gender</div>
                <div class="answer">${data.gender || 'N/A'}</div>
            </div>
            <div class="field">
                <div class="label">Primary Contact (Phone)</div>
                <div class="answer">${data.phone || 'N/A'}</div>
            </div>
            <div class="field full">
                <div class="label">Electronic Mail Address</div>
                <div class="answer">${data.email || 'N/A'}</div>
            </div>
            <div class="field full">
                <div class="label">Physical / Postal Address</div>
                <div class="answer">${data.address || 'N/A'}</div>
            </div>
            <div class="field full">
                <div class="label">Declared Purpose</div>
                <div class="answer">${data.purpose || 'N/A'}</div>
            </div>
            <div class="field">
                <div class="label">Experience Rating</div>
                <div class="answer">${data.experienceRating || 'N/A'}</div>
            </div>
            <div class="field">
                <div class="label">Registration Date</div>
                <div class="answer">${data.registrationDate || 'N/A'}</div>
            </div>
            ${profileSection}
        </div>

        <div class="doc-footer">Downloaded from Iganze Protocol &mdash; Authorized Personnel Only</div>

        <script>window.onload = function(){ window.print(); }<\/script>
    </body>
    </html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(printContent);
    win.document.close();
}

/* ── Document Builder (Physical Form Style) ────────────────────────── */
function buildDocument(id, data) {
    const docWrapper = document.createElement('div');
    docWrapper.className = 'reg-doc';

    /* Timestamp */
    let timestamp = 'N/A';
    if (data.timestamp) {
        try {
            timestamp = data.timestamp.toDate().toLocaleString('en-US', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (_) {
            timestamp = data.submissionDate || 'N/A';
        }
    } else if (data.submissionDate) {
        timestamp = data.submissionDate;
    }

    /* Profile image block (optional) */
    let profileHtml = '';
    if (data.hasImage && data.profileImage) {
        profileHtml = `
        <div class="form-photo-top">
            <img src="${data.profileImage}" alt="Profile Photo" class="form-photo-img">
            <div class="form-photo-meta">
                <div class="field-prompt">Client Profile Photo</div>
                <div class="field-answer" style="border:none;">✓ Attached</div>
            </div>
        </div>`;
    }

    /* Compile fields */
    const fullName = `${data.title ? data.title + ' ' : ''}${data.fullName || 'Unknown'}`;

    const logoImgHtml = logoBase64
        ? `<img src="${logoBase64}" alt="Iganze Protocol" class="doc-logo">`
        : `<div class="brand-logo" style="width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,#00e87a,#00b860);display:flex;align-items:center;justify-content:center;font-size:1.4rem;">💍</div>`;

    docWrapper.innerHTML = `
    <div class="reg-doc-header">
        <div class="reg-doc-identity">
            ${logoImgHtml}
            <div>
                <div class="reg-doc-title">Official Registration</div>
            </div>
        </div>
        <div class="reg-doc-timestamp">RCVD: ${timestamp}</div>
    </div>

    <div class="reg-doc-body">
        ${profileHtml}
        <div class="form-fieldset">
        <div class="form-field full-width">
            <div class="field-prompt">Full Legal Name</div>
            <div class="field-answer">${fullName}</div>
        </div>
        
        <div class="form-field">
            <div class="field-prompt">Identification Number</div>
            <div class="field-answer">${data.idNumber || '<span style="color:var(--text-muted)">N/A</span>'}</div>
        </div>

        <div class="form-field">
            <div class="field-prompt">Date of Birth</div>
            <div class="field-answer">${data.dob || '<span style="color:var(--text-muted)">N/A</span>'}</div>
        </div>

        <div class="form-field">
            <div class="field-prompt">Gender</div>
            <div class="field-answer">${data.gender || '<span style="color:var(--text-muted)">N/A</span>'}</div>
        </div>

        <div class="form-field">
            <div class="field-prompt">Primary Contact (Phone)</div>
            <div class="field-answer">${data.phone || '<span style="color:var(--text-muted)">N/A</span>'}</div>
        </div>

        <div class="form-field full-width">
            <div class="field-prompt">Electronic Mail Address</div>
            <div class="field-answer">${data.email || '<span style="color:var(--text-muted)">N/A</span>'}</div>
        </div>

        <div class="form-field full-width">
            <div class="field-prompt">Physical/Postal Address</div>
            <div class="field-answer">${data.address || '<span style="color:var(--text-muted)">N/A</span>'}</div>
        </div>

        <div class="form-field full-width">
            <div class="field-prompt">Declared Purpose</div>
            <div class="field-answer">${data.purpose || '<span style="color:var(--text-muted)">N/A</span>'}</div>
        </div>

        <div class="form-field">
            <div class="field-prompt">Experience Rating</div>
            <div class="field-answer">${data.experienceRating || '<span style="color:var(--text-muted)">N/A</span>'}</div>
        </div>

        </div>
    </div>

    <!-- Actions at the bottom -->
    <div class="reg-doc-actions">
        <button class="btn-doc-action btn-download-doc" onclick="downloadDocument('${id}')">⬇ Download PDF</button>
        <button class="btn-doc-action btn-edit-doc" onclick="openEditModal('${id}')">Modify Document</button>
        <button class="btn-doc-action btn-del-doc" onclick="deleteRegistration('${id}')">Destroy Document</button>
    </div>
    `;

    return docWrapper;
}

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminLoginTime');
    window.location.href = 'admin-login.html';
}
