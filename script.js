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

// ── Global Variables ────────────────────────────────────────
let currentResumeId = null;
let educationCount = 0;
let experienceCount = 0;
let projectCount = 0;

// ── Page Detection & Initialization ─────────────────────────
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

function initializePage() {
    switch(currentPage) {
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

// ── Authentication State Check ──────────────────────────────
function checkIfLoggedIn() {
    checkAuthState((user) => {
        if (user && currentPage === 'index.html') {
            window.location.href = 'dashboard.html';
        }
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
        
        // Validation
        if (!name || !email || !password) {
            showMessage('Please fill in all fields', 'error');
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
        
        // Sign up
        const result = await signUp(name, email, password);
        
        if (result.success) {
            showMessage('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showMessage(result.error, 'error');
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
        
        const result = await login(email, password);
        
        if (result.success) {
            showMessage('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showMessage(result.error, 'error');
        }
    });
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ══════════════════════════════════════════════════════════
function initDashboard() {
    // Check authentication
    checkAuthState((user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Display user name
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = user.displayName || 'User';
        }
        
        // Load resumes
        loadAllResumes();
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logout();
            window.location.href = 'login.html';
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterResumes(e.target.value);
        });
    }
}

async function loadAllResumes() {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('resumes-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (loading) loading.style.display = 'block';
    
    const result = await getAllResumes();
    
    if (loading) loading.style.display = 'none';
    
    if (result.success) {
        window.allResumes = result.resumes; // Store for filtering
        displayResumes(result.resumes);
        
        if (result.resumes.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (grid) grid.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (grid) grid.style.display = 'grid';
        }
    }
}

function displayResumes(resumes) {
    const grid = document.getElementById('resumes-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    resumes.forEach(resume => {
        const card = createResumeCard(resume);
        grid.appendChild(card);
    });
}

function createResumeCard(resume) {
    const card = document.createElement('div');
    card.className = 'resume-card';
    
    const createdDate = resume.createdAt?.toDate?.() 
        ? resume.createdAt.toDate().toLocaleDateString() 
        : 'N/A';
    
    const currentUser = getCurrentUser();
    const isOwner = currentUser && currentUser.uid === resume.userId;
    
    card.innerHTML = `
        <div class="resume-card-header">
            <div>
                <h3>${escapeHtml(resume.title || 'Untitled Resume')}</h3>
                <div class="resume-card-meta">
                    By: ${escapeHtml(resume.fullName || 'Unknown')} | Created: ${createdDate}
                </div>
            </div>
        </div>
        <div class="resume-card-actions">
            <a href="preview.html?id=${resume.id}" class="btn btn-secondary">👁️ View</a>
            ${isOwner ? `
                <a href="create-resume.html?id=${resume.id}" class="btn btn-secondary">✏️ Edit</a>
                <button class="btn-delete" onclick="handleDeleteResume('${resume.id}')">🗑️ Delete</button>
            ` : ''}
        </div>
    `;
    
    return card;
}

function filterResumes(searchTerm) {
    if (!window.allResumes) return;
    
    const filtered = window.allResumes.filter(resume => {
        const title = (resume.title || '').toLowerCase();
        const name = (resume.fullName || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return title.includes(search) || name.includes(search);
    });
    
    displayResumes(filtered);
}

// Make delete function global
window.handleDeleteResume = async function(resumeId) {
    if (!confirm('Are you sure you want to delete this resume? This cannot be undone.')) {
        return;
    }
    
    const result = await deleteResume(resumeId);
    
    if (result.success) {
        showMessage('Resume deleted successfully', 'success');
        loadAllResumes(); // Reload the list
    } else {
        showMessage('Failed to delete resume', 'error');
    }
};

// ══════════════════════════════════════════════════════════
//  CREATE/EDIT RESUME PAGE
// ══════════════════════════════════════════════════════════
function initCreateResume() {
    // Check authentication
    checkAuthState((user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Check if editing existing resume
        const urlParams = new URLSearchParams(window.location.search);
        const resumeId = urlParams.get('id');
        
        if (resumeId) {
            currentResumeId = resumeId;
            loadResumeData(resumeId);
        } else {
            // Initialize empty form
            addEducation();
            addExperience();
            addProject();
        }
        
        // Setup event listeners
        setupFormListeners();
        updatePreview();
    });
    
    // Save button
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveResumeData);
    }
    
    // Download button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPDF);
    }
}

async function loadResumeData(resumeId) {
    const result = await getResume(resumeId);
    
    if (result.success) {
        const resume = result.resume;
        
        // Fill basic fields
        document.getElementById('resume-title').value = resume.title || '';
        document.getElementById('full-name').value = resume.fullName || '';
        document.getElementById('email').value = resume.email || '';
        document.getElementById('phone').value = resume.phone || '';
        document.getElementById('city').value = resume.city || '';
        document.getElementById('linkedin').value = resume.linkedin || '';
        document.getElementById('summary').value = resume.summary || '';
        
        // Load education
        if (resume.education && resume.education.length > 0) {
            resume.education.forEach(edu => {
                addEducation(edu);
            });
        } else {
            addEducation();
        }
        
        // Load experience
        if (resume.experience && resume.experience.length > 0) {
            resume.experience.forEach(exp => {
                addExperience(exp);
            });
        } else {
            addExperience();
        }
        
        // Load projects
        if (resume.projects && resume.projects.length > 0) {
            resume.projects.forEach(proj => {
                addProject(proj);
            });
        } else {
            addProject();
        }
        
        // Load skills
        if (resume.skills && resume.skills.length > 0) {
            document.getElementById('skills-input').value = resume.skills.join(', ');
            updateSkillsTags();
        }
        
        // Load languages
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
    // Listen to all form inputs for live preview
    const form = document.getElementById('resume-form');
    if (!form) return;
    
    form.addEventListener('input', updatePreview);
    
    // Skills input
    const skillsInput = document.getElementById('skills-input');
    if (skillsInput) {
        skillsInput.addEventListener('input', updateSkillsTags);
    }
    
    // Languages input
    const languagesInput = document.getElementById('languages-input');
    if (languagesInput) {
        languagesInput.addEventListener('input', updateLanguagesTags);
    }
}

async function saveResumeData() {
    const user = getCurrentUser();
    if (!user) {
        showMessage('You must be logged in to save', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('save-btn');
    
    // Gather form data
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
        projects: getProjectsData()
    };
    
    let result;
    
    if (currentResumeId) {
        // Update existing
        result = await updateResume(currentResumeId, resumeData);
    } else {
        // Create new
        result = await createResume(user.uid, resumeData);
        if (result.success) {
            currentResumeId = result.id;
            // Update URL without reload
            window.history.replaceState({}, '', `create-resume.html?id=${result.id}`);
        }
    }
    
    if (result.success) {
        showMessage('Resume saved successfully!', 'success');
        
        // Change button to "Saved" state
        if (saveBtn) {
            saveBtn.innerHTML = '✓ Saved';
            saveBtn.classList.add('saved');
            
            // Reset button after 3 seconds
            setTimeout(() => {
                saveBtn.innerHTML = '💾 Save';
                saveBtn.classList.remove('saved');
            }, 3000);
        }
    } else {
        showMessage('Failed to save resume: ' + result.error, 'error');
    }
}

// ── Dynamic Form Functions ──────────────────────────────────

// Education
window.addEducation = function(data = {}) {
    const list = document.getElementById('education-list');
    const id = educationCount++;
    
    const item = document.createElement('div');
    item.className = 'education-item';
    item.dataset.id = id;
    item.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeItem(this)">×</button>
        <input type="text" class="form-input" placeholder="Degree" value="${escapeHtml(data.degree || '')}" data-field="degree">
        <input type="text" class="form-input" placeholder="School/University" value="${escapeHtml(data.school || '')}" data-field="school">
        <input type="text" class="form-input" placeholder="Year (e.g., 2020-2024)" value="${escapeHtml(data.year || '')}" data-field="year">
    `;
    
    list.appendChild(item);
    item.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updatePreview);
    });
};

// Experience
window.addExperience = function(data = {}) {
    const list = document.getElementById('experience-list');
    const id = experienceCount++;
    
    const item = document.createElement('div');
    item.className = 'experience-item';
    item.dataset.id = id;
    item.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeItem(this)">×</button>
        <input type="text" class="form-input" placeholder="Job Title" value="${escapeHtml(data.title || '')}" data-field="title">
        <input type="text" class="form-input" placeholder="Company" value="${escapeHtml(data.company || '')}" data-field="company">
        <input type="text" class="form-input" placeholder="Duration (e.g., Jan 2020 - Dec 2022)" value="${escapeHtml(data.duration || '')}" data-field="duration">
        <textarea class="form-textarea" placeholder="Description" data-field="description" rows="3">${escapeHtml(data.description || '')}</textarea>
    `;
    
    list.appendChild(item);
    item.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', updatePreview);
    });
};

// Projects
window.addProject = function(data = {}) {
    const list = document.getElementById('projects-list');
    const id = projectCount++;
    
    const item = document.createElement('div');
    item.className = 'project-item';
    item.dataset.id = id;
    item.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeItem(this)">×</button>
        <input type="text" class="form-input" placeholder="Project Name" value="${escapeHtml(data.name || '')}" data-field="name">
        <textarea class="form-textarea" placeholder="Description" data-field="description" rows="3">${escapeHtml(data.description || '')}</textarea>
    `;
    
    list.appendChild(item);
    item.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', updatePreview);
    });
};

// Remove item
window.removeItem = function(button) {
    button.parentElement.remove();
    updatePreview();
};

// ── Data Collection Functions ───────────────────────────────
function getEducationData() {
    const items = document.querySelectorAll('.education-item');
    const data = [];
    
    items.forEach(item => {
        const degree = item.querySelector('[data-field="degree"]').value;
        const school = item.querySelector('[data-field="school"]').value;
        const year = item.querySelector('[data-field="year"]').value;
        
        if (degree || school || year) {
            data.push({ degree, school, year });
        }
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
        
        if (title || company || duration || description) {
            data.push({ title, company, duration, description });
        }
    });
    
    return data;
}

function getProjectsData() {
    const items = document.querySelectorAll('.project-item');
    const data = [];
    
    items.forEach(item => {
        const name = item.querySelector('[data-field="name"]').value;
        const description = item.querySelector('[data-field="description"]').value;
        
        if (name || description) {
            data.push({ name, description });
        }
    });
    
    return data;
}

function getSkillsData() {
    const input = document.getElementById('skills-input');
    if (!input) return [];
    
    return input.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
}

function getLanguagesData() {
    const input = document.getElementById('languages-input');
    if (!input) return [];
    
    return input.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
}

// ── Skills Tags Display ─────────────────────────────────────
function updateSkillsTags() {
    const container = document.getElementById('skills-tags');
    const input = document.getElementById('skills-input');
    
    if (!container || !input) return;
    
    container.innerHTML = '';
    
    const skills = input.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
    
    skills.forEach((skill, index) => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag';
        tag.innerHTML = `
            ${escapeHtml(skill)}
            <span class="skill-tag-remove" onclick="removeSkill(${index})">×</span>
        `;
        container.appendChild(tag);
    });
    
    updatePreview();
}

window.removeSkill = function(index) {
    const input = document.getElementById('skills-input');
    if (!input) return;
    
    const skills = input.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
    
    skills.splice(index, 1);
    input.value = skills.join(', ');
    updateSkillsTags();
};

// ── Languages Tags Display ──────────────────────────────────
function updateLanguagesTags() {
    const container = document.getElementById('languages-tags');
    const input = document.getElementById('languages-input');
    
    if (!container || !input) return;
    
    container.innerHTML = '';
    
    const languages = input.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
    
    languages.forEach((language, index) => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag';
        tag.innerHTML = `
            ${escapeHtml(language)}
            <span class="skill-tag-remove" onclick="removeLanguage(${index})">×</span>
        `;
        container.appendChild(tag);
    });
    
    updatePreview();
}

window.removeLanguage = function(index) {
    const input = document.getElementById('languages-input');
    if (!input) return;
    
    const languages = input.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
    
    languages.splice(index, 1);
    input.value = languages.join(', ');
    updateLanguagesTags();
};

// ── Live Preview ────────────────────────────────────────────
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
    
    container.innerHTML = generateResumeHTML(data);
}

function generateResumeHTML(data) {
    let html = '<div class="resume-sheet">';
    
    // Header
    html += '<div class="resume-header">';
    html += `<h1 class="resume-name">${escapeHtml(data.fullName) || 'Your Name'}</h1>`;
    
    html += '<div class="resume-contact">';
    if (data.email) html += `<span>📧 ${escapeHtml(data.email)}</span>`;
    if (data.phone) html += `<span>📱 ${escapeHtml(data.phone)}</span>`;
    if (data.city) html += `<span>📍 ${escapeHtml(data.city)}</span>`;
    if (data.linkedin) html += `<span>💼 ${escapeHtml(data.linkedin)}</span>`;
    html += '</div>';
    html += '</div>';
    
    // Summary
    if (data.summary) {
        html += '<div class="resume-section">';
        html += '<h2 class="resume-section-title">Professional Summary</h2>';
        html += `<p class="resume-summary">${escapeHtml(data.summary)}</p>`;
        html += '</div>';
    }
    
    // Education
    if (data.education && data.education.length > 0) {
        html += '<div class="resume-section">';
        html += '<h2 class="resume-section-title">Education</h2>';
        data.education.forEach(edu => {
            html += '<div class="resume-item">';
            html += '<div class="resume-item-header">';
            html += `<div>`;
            html += `<div class="resume-item-title">${escapeHtml(edu.degree)}</div>`;
            html += `<div class="resume-item-subtitle">${escapeHtml(edu.school)}</div>`;
            html += `</div>`;
            if (edu.year) html += `<div class="resume-item-date">${escapeHtml(edu.year)}</div>`;
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    
    // Experience
    if (data.experience && data.experience.length > 0) {
        html += '<div class="resume-section">';
        html += '<h2 class="resume-section-title">Work Experience</h2>';
        data.experience.forEach(exp => {
            html += '<div class="resume-item">';
            html += '<div class="resume-item-header">';
            html += `<div>`;
            html += `<div class="resume-item-title">${escapeHtml(exp.title)}</div>`;
            html += `<div class="resume-item-subtitle">${escapeHtml(exp.company)}</div>`;
            html += `</div>`;
            if (exp.duration) html += `<div class="resume-item-date">${escapeHtml(exp.duration)}</div>`;
            html += '</div>';
            if (exp.description) {
                html += `<div class="resume-item-description">${escapeHtml(exp.description)}</div>`;
            }
            html += '</div>';
        });
        html += '</div>';
    }
    
    // Skills
    if (data.skills && data.skills.length > 0) {
        html += '<div class="resume-section">';
        html += '<h2 class="resume-section-title">Skills</h2>';
        html += '<div class="resume-skills">';
        data.skills.forEach(skill => {
            html += `<span class="resume-skill">${escapeHtml(skill)}</span>`;
        });
        html += '</div>';
        html += '</div>';
    }
    
    // Languages
    if (data.languages && data.languages.length > 0) {
        html += '<div class="resume-section">';
        html += '<h2 class="resume-section-title">Languages</h2>';
        html += '<div class="resume-languages">';
        data.languages.forEach(language => {
            html += `<span class="resume-language">${escapeHtml(language)}</span>`;
        });
        html += '</div>';
        html += '</div>';
    }
    
    // Projects
    if (data.projects && data.projects.length > 0) {
        html += '<div class="resume-section">';
        html += '<h2 class="resume-section-title">Projects</h2>';
        data.projects.forEach(proj => {
            html += '<div class="resume-item">';
            html += `<div class="resume-item-title">${escapeHtml(proj.name)}</div>`;
            if (proj.description) {
                html += `<div class="resume-item-description">${escapeHtml(proj.description)}</div>`;
            }
            html += '</div>';
        });
        html += '</div>';
    }
    
    html += '</div>';
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
        
        loadResumePreview(resumeId);
        
        // Setup edit button
        const editBtn = document.getElementById('edit-btn');
        if (editBtn) {
            editBtn.href = `create-resume.html?id=${resumeId}`;
        }
    });
    
    // Download button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPDF);
    }
}

async function loadResumePreview(resumeId) {
    const result = await getResume(resumeId);
    
    if (result.success) {
        const container = document.getElementById('resume-preview');
        if (container) {
            container.innerHTML = generateResumeHTML(result.resume);
        }
    } else {
        showMessage('Failed to load resume', 'error');
    }
}

// ── PDF Download ────────────────────────────────────────────
function downloadPDF() {
    window.print();
}

// ══════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════
function showMessage(message, type = 'error') {
    const messageEl = document.getElementById('message');
    
    if (!messageEl) {
        // Try toast message
        const toast = document.getElementById('message-toast') || 
                      document.querySelector('.message-toast');
        
        if (toast) {
            toast.textContent = message;
            toast.className = `message-toast ${type} show`;
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        } else {
            alert(message);
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}