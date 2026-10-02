/* ========================================
   BloodConnect — Auth Module
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) initLogin(loginForm);
    if (signupForm) initSignup(signupForm);

    // Password show/hide toggle
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else {
                input.type = 'password';
                btn.textContent = '👁';
            }
        });
    });
});

function initLogin(form) {
    // Redirect if already logged in
    const session = getSession();
    if (session) {
        window.location.href = 'index.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.querySelector('#username').value.trim();
        const password = form.querySelector('#password').value;
        const role = form.querySelector('#role').value;

        if (!username || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            const user = await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password, role }),
            });

            setSession(user);
            showToast(`Welcome back, ${user.name}!`, 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        } catch (err) {
            showToast(err.message || 'Invalid credentials. Please check your username, password, and role.', 'error');
            form.querySelector('#password').value = '';
        }
    });
}

function initSignup(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const name = formData.get('name')?.trim();
        const email = formData.get('email')?.trim();
        const username = formData.get('username')?.trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const role = formData.get('role');
        const phone = formData.get('phone')?.trim();
        const bloodGroup = formData.get('bloodGroup');

        // Validation
        if (!name || !email || !username || !password || !role) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        try {
            await api('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ name, email, username, password, role, phone, bloodGroup }),
            });

            showToast('Account created successfully! Please log in.', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1200);
        } catch (err) {
            showToast(err.message || 'Signup failed', 'error');
        }
    });

    // Show/hide blood group field based on role
    const roleSelect = form.querySelector('#signupRole');
    const bloodGroupField = document.getElementById('bloodGroupField');
    if (roleSelect && bloodGroupField) {
        roleSelect.addEventListener('change', () => {
            bloodGroupField.style.display = roleSelect.value === 'donor' ? 'block' : 'none';
        });
    }
}
