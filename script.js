// ============================================================
// script.js - Main Application Logic
// ============================================================

import { auth, db } from './firebase.config.js';
import { signUp, login, logout, checkAuthState, getCurrentUser } from './auth.js';
import {
    createResume,
    getAllResumes,
    getResume,
    updateResume,
    deleteResume
} from './db.js';

// ── Global Variables ─────────────────────────────────────────
let currentResumeId = null;
let educationCount = 0;
let experienceCount = 0;
let projectCount = 0;
let currentTemplate = 'classic'; // classic | modern | sidebar

// ── Page Detection ────────────────────────────────────────────
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

function initializePage() {
    switch (currentPage) {
        case 'index.html':
        case '':
            checkIfLoggedIn();
            break;
        case 'signup.html':
            initSignupPage();
            break;
        case 'login.html':
            initLoginPage();
            break;
        case 'dashboard.html':
            initDashboard();
            break;
        case 'create-resume.html':
            initCreateResume();
            break;
        case 'preview.html':
            initPreview();
            break;
    }
}

function checkIfLoggedIn() {
    checkAuthState((user) => {
        if (user) window.location.href = 'dashboard.html';
    });
}

// ══════════════════════════════════════════════════════════
//  SIGNUP PAGE
// ══════════════════════════════════════════════════════════
function initSignupPage() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!name || !email || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage('Please enter a valid email address', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creating Account...';

        const result = await signUp(name, email, password);

        btn.disabled = false;
        btn.textContent = 'Sign Up';

        if (result.success) {
            showMessage('Account created! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            // Translate Firebase error messages to Urdu/readable English
            let errorMsg = result.error;
            if (errorMsg.includes('email-already-in-use')) errorMsg = 'This email is already registered. Please login.';
            else if (errorMsg.includes('invalid-email')) errorMsg = 'Invalid email address format.';
            else if (errorMsg.includes('weak-password')) errorMsg = 'Password is too weak. Use at least 6 characters.';
            showMessage(errorMsg, 'error');
        }
    });
}

// ══════════════════════════════════════════════════════════
//  LOGIN PAGE
// ══════════════════════════════════════════════════════════
function initLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Logging in...';

        const result = await login(email, password);

        btn.disabled = false;
        btn.textContent = 'Login';

        if (result.success) {
            showMessage('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            let errorMsg = result.error;
            if (errorMsg.includes('user-not-found') || errorMsg.includes('wrong-password') || errorMsg.includes('invalid-credential')) {
                errorMsg = 'Invalid email or password.';
            }
            showMessage(errorMsg, 'error');
        }
    });
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ══════════════════════════════════════════════════════════
function initDashboard() {
    checkAuthState((user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Show user info in navbar
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            userNameEl.textContent = user.displayName || user.email;
        }

        // Show user email in profile section
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) userEmailEl.textContent = user.email;

        const userAvatarEl = document.getElementById('user-avatar');
        if (userAvatarEl) {
            userAvatarEl.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
        }

        loadAllResumes(user.uid);
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logout();
            window.location.href = 'index.html';
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterResumes(e.target.value);
        });
    }
}

async function loadAllResumes(currentUserId) {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('resumes-grid');
    const emptyState = document.getElementById('empty-state');

    if (loading) loading.style.display = 'block';
    if (grid) grid.style.display = 'none';

    const result = await getAllResumes();

    if (loading) loading.style.display = 'none';

    if (result.success) {
        window.allResumes = result.resumes;
        window.currentUserId = currentUserId;
        displayResumes(result.resumes, currentUserId);

        if (result.resumes.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (grid) grid.style.display = 'grid';
        }
    } else {
        if (loading) loading.textContent = 'Failed to load resumes.';
    }
}

function displayResumes(resumes, currentUserId) {
    const grid = document.getElementById('resumes-grid');
    if (!grid) return;

    grid.innerHTML = '';
    resumes.forEach(resume => {
        const card = createResumeCard(resume, currentUserId);
        grid.appendChild(card);
    });
}

function createResumeCard(resume, currentUserId) {
    const card = document.createElement('div');
    card.className = 'resume-card';

    const createdDate = resume.createdAt?.toDate?.()
        ? resume.createdAt.toDate().toLocaleDateString()
        : 'N/A';

    const isOwner = currentUserId && currentUserId === resume.userId;

    card.innerHTML = `
        <div class="resume-card-header">
            <div>
                <h3>${escapeHtml(resume.title || 'Untitled Resume')}</h3>
                <div class="resume-card-meta">
                    <i class="fa fa-user"></i> ${escapeHtml(resume.fullName || 'Unknown')}
                    &nbsp;&nbsp;<i class="fa fa-calendar"></i> ${createdDate}
                    ${isOwner ? '<span class="owner-badge"><i class="fa fa-star"></i> Mine</span>' : ''}
                </div>
            </div>
        </div>
        <div class="resume-card-actions">
            <a href="preview.html?id=${resume.id}" class="btn btn-secondary btn-sm">
                <i class="fa fa-eye"></i> View
            </a>
            ${isOwner ? `
                <a href="create-resume.html?id=${resume.id}" class="btn btn-secondary btn-sm">
                    <i class="fa fa-edit"></i> Edit
                </a>
                <button class="btn btn-danger btn-sm" onclick="handleDeleteResume('${resume.id}')">
                    <i class="fa fa-trash"></i> Delete
                </button>
            ` : ''}
        </div>
    `;

    return card;
}

function filterResumes(searchTerm) {
    if (!window.allResumes) return;
    const term = searchTerm.toLowerCase().trim();
    const filtered = window.allResumes.filter(resume => {
        return (
            (resume.title || '').toLowerCase().includes(term) ||
            (resume.fullName || '').toLowerCase().includes(term)
        );
    });
    displayResumes(filtered, window.currentUserId);

    const emptyState = document.getElementById('empty-state');
    const grid = document.getElementById('resumes-grid');
    if (filtered.length === 0) {
        if (emptyState) { emptyState.style.display = 'block'; emptyState.querySelector('h3').textContent = 'No Results Found'; }
        if (grid) grid.style.display = 'none';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (grid) grid.style.display = 'grid';
    }
}

window.handleDeleteResume = async function (resumeId) {
    if (!confirm('Are you sure you want to delete this resume? This cannot be undone.')) return;

    const result = await deleteResume(resumeId);

    if (result.success) {
        showMessage('Resume deleted successfully', 'success');
        loadAllResumes(window.currentUserId);
    } else {
        showMessage('Failed to delete resume: ' + result.error, 'error');
    }
};

// ══════════════════════════════════════════════════════════
//  CREATE/EDIT RESUME PAGE
// ══════════════════════════════════════════════════════════
function initCreateResume() {
    checkAuthState((user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const resumeId = urlParams.get('id');

        if (resumeId) {
            currentResumeId = resumeId;
            loadResumeData(resumeId);
        } else {
            addEducation();
            addExperience();
            addProject();
        }

        setupFormListeners();
        setupTemplateSelector();
        updatePreview();
    });

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveResumeData);
    }

    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPDF);
    }
}

async function loadResumeData(resumeId) {
    const result = await getResume(resumeId);

    if (result.success) {
        const resume = result.resume;

        document.getElementById('resume-title').value = resume.title || '';
        document.getElementById('full-name').value = resume.fullName || '';
        document.getElementById('email').value = resume.email || '';
        document.getElementById('phone').value = resume.phone || '';
        document.getElementById('city').value = resume.city || '';
        document.getElementById('linkedin').value = resume.linkedin || '';
        document.getElementById('summary').value = resume.summary || '';

        if (resume.template) {
            currentTemplate = resume.template;
            const radio = document.querySelector(`input[name="template"][value="${resume.template}"]`);
            if (radio) radio.checked = true;
        }

        if (resume.education && resume.education.length > 0) {
            resume.education.forEach(edu => addEducation(edu));
        } else { addEducation(); }

        if (resume.experience && resume.experience.length > 0) {
            resume.experience.forEach(exp => addExperience(exp));
        } else { addExperience(); }

        if (resume.projects && resume.projects.length > 0) {
            resume.projects.forEach(proj => addProject(proj));
        } else { addProject(); }

        if (resume.skills && resume.skills.length > 0) {
            document.getElementById('skills-input').value = resume.skills.join(', ');
            updateSkillsTags();
        }

        if (resume.languages && resume.languages.length > 0) {
            document.getElementById('languages-input').value = resume.languages.join(', ');
            updateLanguagesTags();
        }

        updatePreview();
    } else {
        showMessage('Failed to load resume', 'error');
    }
}

function setupFormListeners() {
    const form = document.getElementById('resume-form');
    if (!form) return;
    form.addEventListener('input', updatePreview);

    const skillsInput = document.getElementById('skills-input');
    if (skillsInput) skillsInput.addEventListener('input', updateSkillsTags);

    const languagesInput = document.getElementById('languages-input');
    if (languagesInput) languagesInput.addEventListener('input', updateLanguagesTags);
}

function setupTemplateSelector() {
    const radios = document.querySelectorAll('input[name="template"]');
    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            currentTemplate = radio.value;
            updatePreview();
        });
    });
}

async function saveResumeData() {
    const user = getCurrentUser();
    if (!user) {
        showMessage('You must be logged in to save', 'error');
        return;
    }

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...'; }

    const resumeData = {
        title: document.getElementById('resume-title').value || 'Untitled Resume',
        fullName: document.getElementById('full-name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        city: document.getElementById('city').value,
        linkedin: document.getElementById('linkedin').value,
        summary: document.getElementById('summary').value,
        education: getEducationData(),
        experience: getExperienceData(),
        skills: getSkillsData(),
        languages: getLanguagesData(),
        projects: getProjectsData(),
        template: currentTemplate
    };

    let result;

    if (currentResumeId) {
        result = await updateResume(currentResumeId, resumeData);
    } else {
        result = await createResume(user.uid, resumeData);
        if (result.success) {
            currentResumeId = result.id;
            window.history.replaceState({}, '', `create-resume.html?id=${result.id}`);
        }
    }

    if (saveBtn) { saveBtn.disabled = false; }

    if (result.success) {
        showMessage('Resume saved successfully!', 'success');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fa fa-check"></i> Saved';
            saveBtn.classList.add('saved');
            setTimeout(() => {
                saveBtn.innerHTML = '<i class="fa fa-save"></i> Save';
                saveBtn.classList.remove('saved');
            }, 3000);
        }
        // Redirect to dashboard after 1.5s
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } else {
        showMessage('Failed to save resume: ' + result.error, 'error');
        if (saveBtn) saveBtn.innerHTML = '<i class="fa fa-save"></i> Save';
    }
}

// ── Dynamic Form Functions ────────────────────────────────────

window.addEducation = function (data = {}) {
    const list = document.getElementById('education-list');
    const id = educationCount++;
    const item = document.createElement('div');
    item.className = 'education-item';
    item.dataset.id = id;
    item.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeItem(this)"><i class="fa fa-times"></i></button>
        <input type="text" class="form-input" placeholder="Degree / Qualification" value="${escapeHtml(data.degree || '')}" data-field="degree">
        <input type="text" class="form-input" placeholder="School / University" value="${escapeHtml(data.school || '')}" data-field="school">
        <input type="text" class="form-input" placeholder="Year (e.g., 2020-2024)" value="${escapeHtml(data.year || '')}" data-field="year">
    `;
    list.appendChild(item);
    item.querySelectorAll('input').forEach(input => input.addEventListener('input', updatePreview));
};

window.addExperience = function (data = {}) {
    const list = document.getElementById('experience-list');
    const id = experienceCount++;
    const item = document.createElement('div');
    item.className = 'experience-item';
    item.dataset.id = id;
    item.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeItem(this)"><i class="fa fa-times"></i></button>
        <input type="text" class="form-input" placeholder="Job Title" value="${escapeHtml(data.title || '')}" data-field="title">
        <input type="text" class="form-input" placeholder="Company" value="${escapeHtml(data.company || '')}" data-field="company">
        <input type="text" class="form-input" placeholder="Duration (e.g., Jan 2020 - Dec 2022)" value="${escapeHtml(data.duration || '')}" data-field="duration">
        <textarea class="form-textarea" placeholder="Description" data-field="description" rows="3">${escapeHtml(data.description || '')}</textarea>
    `;
    list.appendChild(item);
    item.querySelectorAll('input, textarea').forEach(input => input.addEventListener('input', updatePreview));
};

window.addProject = function (data = {}) {
    const list = document.getElementById('projects-list');
    const id = projectCount++;
    const item = document.createElement('div');
    item.className = 'project-item';
    item.dataset.id = id;
    item.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeItem(this)"><i class="fa fa-times"></i></button>
        <input type="text" class="form-input" placeholder="Project Name" value="${escapeHtml(data.name || '')}" data-field="name">
        <textarea class="form-textarea" placeholder="Description" data-field="description" rows="3">${escapeHtml(data.description || '')}</textarea>
    `;
    list.appendChild(item);
    item.querySelectorAll('input, textarea').forEach(input => input.addEventListener('input', updatePreview));
};

window.removeItem = function (button) {
    button.parentElement.remove();
    updatePreview();
};

function getEducationData() {
    const items = document.querySelectorAll('.education-item');
    const data = [];
    items.forEach(item => {
        const degree = item.querySelector('[data-field="degree"]').value;
        const school = item.querySelector('[data-field="school"]').value;
        const year = item.querySelector('[data-field="year"]').value;
        if (degree || school || year) data.push({ degree, school, year });
    });
    return data;
}

function getExperienceData() {
    const items = document.querySelectorAll('.experience-item');
    const data = [];
    items.forEach(item => {
        const title = item.querySelector('[data-field="title"]').value;
        const company = item.querySelector('[data-field="company"]').value;
        const duration = item.querySelector('[data-field="duration"]').value;
        const description = item.querySelector('[data-field="description"]').value;
        if (title || company || duration || description) data.push({ title, company, duration, description });
    });
    return data;
}

function getProjectsData() {
    const items = document.querySelectorAll('.project-item');
    const data = [];
    items.forEach(item => {
        const name = item.querySelector('[data-field="name"]').value;
        const description = item.querySelector('[data-field="description"]').value;
        if (name || description) data.push({ name, description });
    });
    return data;
}

function getSkillsData() {
    const input = document.getElementById('skills-input');
    if (!input) return [];
    return input.value.split(',').map(s => s.trim()).filter(s => s);
}

function getLanguagesData() {
    const input = document.getElementById('languages-input');
    if (!input) return [];
    return input.value.split(',').map(s => s.trim()).filter(s => s);
}

function updateSkillsTags() {
    const container = document.getElementById('skills-tags');
    const input = document.getElementById('skills-input');
    if (!container || !input) return;
    container.innerHTML = '';
    const skills = input.value.split(',').map(s => s.trim()).filter(s => s);
    skills.forEach((skill, index) => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag';
        tag.innerHTML = `${escapeHtml(skill)} <span class="skill-tag-remove" onclick="removeSkill(${index})"><i class="fa fa-times"></i></span>`;
        container.appendChild(tag);
    });
    updatePreview();
}

window.removeSkill = function (index) {
    const input = document.getElementById('skills-input');
    if (!input) return;
    const skills = input.value.split(',').map(s => s.trim()).filter(s => s);
    skills.splice(index, 1);
    input.value = skills.join(', ');
    updateSkillsTags();
};

function updateLanguagesTags() {
    const container = document.getElementById('languages-tags');
    const input = document.getElementById('languages-input');
    if (!container || !input) return;
    container.innerHTML = '';
    const languages = input.value.split(',').map(s => s.trim()).filter(s => s);
    languages.forEach((language, index) => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag';
        tag.innerHTML = `${escapeHtml(language)} <span class="skill-tag-remove" onclick="removeLanguage(${index})"><i class="fa fa-times"></i></span>`;
        container.appendChild(tag);
    });
    updatePreview();
}

window.removeLanguage = function (index) {
    const input = document.getElementById('languages-input');
    if (!input) return;
    const languages = input.value.split(',').map(s => s.trim()).filter(s => s);
    languages.splice(index, 1);
    input.value = languages.join(', ');
    updateLanguagesTags();
};

// ── Live Preview ──────────────────────────────────────────────
function updatePreview() {
    const container = document.getElementById('preview-container');
    if (!container) return;

    const data = {
        fullName: document.getElementById('full-name')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        city: document.getElementById('city')?.value || '',
        linkedin: document.getElementById('linkedin')?.value || '',
        summary: document.getElementById('summary')?.value || '',
        education: getEducationData(),
        experience: getExperienceData(),
        skills: getSkillsData(),
        languages: getLanguagesData(),
        projects: getProjectsData()
    };

    container.innerHTML = generateResumeHTML(data, currentTemplate);
}

// ══════════════════════════════════════════════════════════
//  RESUME TEMPLATES
// ══════════════════════════════════════════════════════════
function generateResumeHTML(data, template = 'classic') {
    switch (template) {
        case 'modern': return generateModernResume(data);
        case 'sidebar': return generateSidebarResume(data);
        default: return generateClassicResume(data);
    }
}

// --- Template 1: Classic ---
function generateClassicResume(data) {
    let html = '<div class="resume-sheet resume-classic">';

    html += '<div class="rc-header">';
    html += `<h1 class="rc-name">${escapeHtml(data.fullName) || 'Your Name'}</h1>`;
    html += '<div class="rc-contact">';
    if (data.email) html += `<span><i class="fa fa-envelope"></i> ${escapeHtml(data.email)}</span>`;
    if (data.phone) html += `<span><i class="fa fa-phone"></i> ${escapeHtml(data.phone)}</span>`;
    if (data.city) html += `<span><i class="fa fa-map-marker"></i> ${escapeHtml(data.city)}</span>`;
    if (data.linkedin) html += `<span><i class="fa fa-linkedin"></i> ${escapeHtml(data.linkedin)}</span>`;
    html += '</div></div>';

    if (data.summary) {
        html += '<div class="rc-section"><h2 class="rc-title"><i class="fa fa-user"></i> Professional Summary</h2>';
        html += `<p class="rc-summary">${escapeHtml(data.summary)}</p></div>`;
    }

    if (data.experience && data.experience.length > 0) {
        html += '<div class="rc-section"><h2 class="rc-title"><i class="fa fa-briefcase"></i> Work Experience</h2>';
        data.experience.forEach(exp => {
            html += '<div class="rc-item">';
            html += '<div class="rc-item-header">';
            html += `<div><div class="rc-item-title">${escapeHtml(exp.title)}</div><div class="rc-item-sub">${escapeHtml(exp.company)}</div></div>`;
            if (exp.duration) html += `<div class="rc-date">${escapeHtml(exp.duration)}</div>`;
            html += '</div>';
            if (exp.description) html += `<div class="rc-desc">${escapeHtml(exp.description)}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    if (data.education && data.education.length > 0) {
        html += '<div class="rc-section"><h2 class="rc-title"><i class="fa fa-graduation-cap"></i> Education</h2>';
        data.education.forEach(edu => {
            html += '<div class="rc-item">';
            html += '<div class="rc-item-header">';
            html += `<div><div class="rc-item-title">${escapeHtml(edu.degree)}</div><div class="rc-item-sub">${escapeHtml(edu.school)}</div></div>`;
            if (edu.year) html += `<div class="rc-date">${escapeHtml(edu.year)}</div>`;
            html += '</div></div>';
        });
        html += '</div>';
    }

    if (data.skills && data.skills.length > 0) {
        html += '<div class="rc-section"><h2 class="rc-title"><i class="fa fa-cogs"></i> Skills</h2>';
        html += '<div class="rc-skills">';
        data.skills.forEach(s => { html += `<span class="rc-skill">${escapeHtml(s)}</span>`; });
        html += '</div></div>';
    }

    if (data.languages && data.languages.length > 0) {
        html += '<div class="rc-section"><h2 class="rc-title"><i class="fa fa-language"></i> Languages</h2>';
        html += '<div class="rc-skills">';
        data.languages.forEach(l => { html += `<span class="rc-lang">${escapeHtml(l)}</span>`; });
        html += '</div></div>';
    }

    if (data.projects && data.projects.length > 0) {
        html += '<div class="rc-section"><h2 class="rc-title"><i class="fa fa-folder-open"></i> Projects</h2>';
        data.projects.forEach(proj => {
            html += '<div class="rc-item">';
            html += `<div class="rc-item-title">${escapeHtml(proj.name)}</div>`;
            if (proj.description) html += `<div class="rc-desc">${escapeHtml(proj.description)}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

// --- Template 2: Modern ---
function generateModernResume(data) {
    let html = '<div class="resume-sheet resume-modern">';

    // Header band
    html += '<div class="rm-header">';
    html += `<div class="rm-name">${escapeHtml(data.fullName) || 'Your Name'}</div>`;
    html += '<div class="rm-contact">';
    if (data.email) html += `<span><i class="fa fa-envelope-o"></i> ${escapeHtml(data.email)}</span>`;
    if (data.phone) html += `<span><i class="fa fa-phone"></i> ${escapeHtml(data.phone)}</span>`;
    if (data.city) html += `<span><i class="fa fa-map-marker"></i> ${escapeHtml(data.city)}</span>`;
    if (data.linkedin) html += `<span><i class="fa fa-linkedin-square"></i> ${escapeHtml(data.linkedin)}</span>`;
    html += '</div></div>';

    html += '<div class="rm-body">';

    if (data.summary) {
        html += '<div class="rm-section"><div class="rm-section-label">About Me</div>';
        html += `<p class="rm-summary">${escapeHtml(data.summary)}</p></div>`;
    }

    if (data.experience && data.experience.length > 0) {
        html += '<div class="rm-section"><div class="rm-section-label">Experience</div>';
        data.experience.forEach(exp => {
            html += '<div class="rm-item">';
            html += `<div class="rm-item-top"><span class="rm-item-title">${escapeHtml(exp.title)}</span>${exp.duration ? `<span class="rm-item-date">${escapeHtml(exp.duration)}</span>` : ''}</div>`;
            html += `<div class="rm-item-company">${escapeHtml(exp.company)}</div>`;
            if (exp.description) html += `<div class="rm-desc">${escapeHtml(exp.description)}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    if (data.education && data.education.length > 0) {
        html += '<div class="rm-section"><div class="rm-section-label">Education</div>';
        data.education.forEach(edu => {
            html += '<div class="rm-item">';
            html += `<div class="rm-item-top"><span class="rm-item-title">${escapeHtml(edu.degree)}</span>${edu.year ? `<span class="rm-item-date">${escapeHtml(edu.year)}</span>` : ''}</div>`;
            html += `<div class="rm-item-company">${escapeHtml(edu.school)}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    if (data.skills && data.skills.length > 0) {
        html += '<div class="rm-section"><div class="rm-section-label">Skills</div>';
        html += '<div class="rm-skills">';
        data.skills.forEach(s => { html += `<span class="rm-skill">${escapeHtml(s)}</span>`; });
        html += '</div></div>';
    }

    if (data.languages && data.languages.length > 0) {
        html += '<div class="rm-section"><div class="rm-section-label">Languages</div>';
        html += '<div class="rm-skills">';
        data.languages.forEach(l => { html += `<span class="rm-lang">${escapeHtml(l)}</span>`; });
        html += '</div></div>';
    }

    if (data.projects && data.projects.length > 0) {
        html += '<div class="rm-section"><div class="rm-section-label">Projects</div>';
        data.projects.forEach(proj => {
            html += '<div class="rm-item">';
            html += `<div class="rm-item-title">${escapeHtml(proj.name)}</div>`;
            if (proj.description) html += `<div class="rm-desc">${escapeHtml(proj.description)}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    html += '</div></div>';
    return html;
}

// --- Template 3: Sidebar ---
function generateSidebarResume(data) {
    let html = '<div class="resume-sheet resume-sidebar">';

    // Left Sidebar
    html += '<div class="rs-left">';
    html += `<div class="rs-avatar">${(escapeHtml(data.fullName) || 'U')[0].toUpperCase()}</div>`;
    html += `<div class="rs-name">${escapeHtml(data.fullName) || 'Your Name'}</div>`;

    html += '<div class="rs-contact">';
    if (data.email) html += `<div class="rs-contact-item"><i class="fa fa-envelope"></i> ${escapeHtml(data.email)}</div>`;
    if (data.phone) html += `<div class="rs-contact-item"><i class="fa fa-phone"></i> ${escapeHtml(data.phone)}</div>`;
    if (data.city) html += `<div class="rs-contact-item"><i class="fa fa-map-marker"></i> ${escapeHtml(data.city)}</div>`;
    if (data.linkedin) html += `<div class="rs-contact-item"><i class="fa fa-linkedin"></i> ${escapeHtml(data.linkedin)}</div>`;
    html += '</div>';

    if (data.skills && data.skills.length > 0) {
        html += '<div class="rs-section"><div class="rs-section-title">Skills</div>';
        data.skills.forEach(s => { html += `<div class="rs-skill-bar"><span>${escapeHtml(s)}</span></div>`; });
        html += '</div>';
    }

    if (data.languages && data.languages.length > 0) {
        html += '<div class="rs-section"><div class="rs-section-title">Languages</div>';
        data.languages.forEach(l => { html += `<div class="rs-skill-bar"><span>${escapeHtml(l)}</span></div>`; });
        html += '</div>';
    }

    html += '</div>'; // rs-left

    // Right Main
    html += '<div class="rs-right">';

    if (data.summary) {
        html += '<div class="rs-main-section"><div class="rs-main-title"><i class="fa fa-user-circle"></i> Profile</div>';
        html += `<p class="rs-summary">${escapeHtml(data.summary)}</p></div>`;
    }

    if (data.experience && data.experience.length > 0) {
        html += '<div class="rs-main-section"><div class="rs-main-title"><i class="fa fa-briefcase"></i> Work Experience</div>';
        data.experience.forEach(exp => {
            html += '<div class="rs-main-item">';
            html += `<div class="rs-main-item-head"><div class="rs-main-item-title">${escapeHtml(exp.title)}</div>${exp.duration ? `<div class="rs-date">${escapeHtml(exp.duration)}</div>` : ''}</div>`;
            html += `<div class="rs-main-item-sub">${escapeHtml(exp.company)}</div>`;
            if (exp.description) html += `<div class="rs-main-item-desc">${escapeHtml(exp.description)}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    if (data.education && data.education.length > 0) {
        html += '<div class="rs-main-section"><div class="rs-main-title"><i class="fa fa-graduation-cap"></i> Education</div>';
        data.education.forEach(edu => {
            html += '<div class="rs-main-item">';
            html += `<div class="rs-main-item-head"><div class="rs-main-item-title">${escapeHtml(edu.degree)}</div>${edu.year ? `<div class="rs-date">${escapeHtml(edu.year)}</div>` : ''}</div>`;
            html += `<div class="rs-main-item-sub">${escapeHtml(edu.school)}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    if (data.projects && data.projects.length > 0) {
        html += '<div class="rs-main-section"><div class="rs-main-title"><i class="fa fa-folder-open"></i> Projects</div>';
        data.projects.forEach(proj => {
            html += '<div class="rs-main-item">';
            html += `<div class="rs-main-item-title">${escapeHtml(proj.name)}</div>`;
            if (proj.description) html += `<div class="rs-main-item-desc">${escapeHtml(proj.description)}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    html += '</div>'; // rs-right
    html += '</div>'; // resume-sidebar
    return html;
}

// ══════════════════════════════════════════════════════════
//  PREVIEW PAGE
// ══════════════════════════════════════════════════════════
function initPreview() {
    checkAuthState((user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const resumeId = urlParams.get('id');

        if (!resumeId) {
            window.location.href = 'dashboard.html';
            return;
        }

        loadResumePreview(resumeId, user);

        const editBtn = document.getElementById('edit-btn');
        if (editBtn) editBtn.href = `create-resume.html?id=${resumeId}`;
    });

    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPDF);
    }
}

async function loadResumePreview(resumeId, currentUser) {
    const result = await getResume(resumeId);

    if (result.success) {
        const resume = result.resume;
        const container = document.getElementById('resume-preview');
        if (container) {
            container.innerHTML = generateResumeHTML(resume, resume.template || 'classic');
        }

        // Only show edit/download to owner
        const isOwner = currentUser && currentUser.uid === resume.userId;
        const downloadBtn = document.getElementById('download-btn');
        const editBtn = document.getElementById('edit-btn');

        if (!isOwner) {
            if (downloadBtn) downloadBtn.style.display = 'none';
            if (editBtn) editBtn.style.display = 'none';
        }
    } else {
        showMessage('Failed to load resume', 'error');
    }
}

function downloadPDF() {
    window.print();
}

// ══════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════
function showMessage(message, type = 'error') {
    const messageEl = document.getElementById('message');

    if (!messageEl) {
        const toast = document.querySelector('.message-toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `message-toast ${type} show`;
            setTimeout(() => { toast.classList.remove('show'); }, 3500);
        }
        return;
    }

    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';

    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 4000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}