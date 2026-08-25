import { sb } from './supabase.js';

export function openAuth(mode) {
    window.currentMode = mode;
    const isSign = mode === 'signin';
    const content = document.getElementById('auth-content');
    if (!content) return;

    content.innerHTML = `
        <h2 style="font-size: 36px; font-weight: 950; letter-spacing: -2px;">${isSign ? 'Welcome Back' : 'Join ClearSpend'}</h2>
        <p style="color: var(--muted); margin-bottom: 30px;">${isSign ? 'Access your private vault.' : 'Sync your profile to the cloud.'}</p>
        <input type="email" id="auth-email" placeholder="name@email.com">
        <div style="text-align: left;"><label class="input-label">${isSign ? 'Enter Password' : 'Create Password'}</label></div>
        <input type="password" id="auth-password" placeholder="Min. 6 characters">
        <button class="btn-primary" style="width: 100%;" id="submit-auth-btn">${isSign ? 'Sign In' : 'Create Account'}</button>
        <div style="margin-top: 20px; font-weight: 800; color: var(--indigo); cursor: pointer;" id="toggle-auth-mode">${isSign ? 'Need an account? Join Free' : 'Already have an account? Sign In'}</div>
        <button class="btn-secondary" style="margin-top: 15px; width: 100%; font-size: 13px;" id="cancel-auth-btn">Cancel</button>
    `;
    document.getElementById('auth-modal').style.display = 'flex';

    document.getElementById('submit-auth-btn').onclick = () => handleAuth(mode);
    document.getElementById('toggle-auth-mode').onclick = () => openAuth(isSign ? 'signup' : 'signin');
    document.getElementById('cancel-auth-btn').onclick = closeAuth;
}

export function closeAuth() {
    document.getElementById('auth-modal').style.display = 'none';
}

export async function handleAuth(mode) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    const { error } = mode === 'signin' 
        ? await sb.auth.signInWithPassword({ email, password }) 
        : await sb.auth.signUp({ email, password });
        
    if (error) alert(error.message); 
    else location.reload();
}

window.openAuth = openAuth;
window.closeAuth = closeAuth;

// Mount event triggers to interactive objects safely on window initialization
window.addEventListener('DOMContentLoaded', () => {
    const navBtn = document.getElementById('nav-signin-btn');
    if (navBtn) navBtn.onclick = () => openAuth('signin');

    const freeBtn = document.getElementById('tier-free-btn');
    if (freeBtn) freeBtn.onclick = () => openAuth('signup');

    const starterBtn = document.getElementById('tier-starter-btn');
    if (starterBtn) starterBtn.onclick = () => {
        window.location.href = 'https://stripe.com';
    };

    const proBtn = document.getElementById('tier-pro-btn');
    if (proBtn) proBtn.onclick = () => {
        window.location.href = 'https://stripe.com';
    };

    document.querySelectorAll('.lock-scroll-trigger').forEach(el => {
        el.onclick = () => {
            document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
        };
    });
});
