/* ========================================
   BloodConnect — Auth Module
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    seedIfNeeded();

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
    const session = getData('session');
    if (session) {
        window.location.href = 'index.html';
        return;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = form.querySelector('#username').value.trim();
        const password = form.querySelector('#password').value;
        const role = form.querySelector('#role').value;

        if (!username || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        const users = getData('users') || [];
        const user = users.find(u =>
            u.username.toLowerCase() === username.toLowerCase() &&
            u.password === password &&
            u.role === role
        );

        if (user) {
            setData('session', {
                id: user.id,
                name: user.name,
                role: user.role,
                username: user.username,
                email: user.email,
                donorId: user.donorId || null,
                loginTime: new Date().toISOString()
            });
            showToast(`Welcome back, ${user.name}!`, 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        } else {
            showToast('Invalid credentials. Please check your username, password, and role.', 'error');
            form.querySelector('#password').value = '';
        }
    });
}

function initSignup(form) {
    form.addEventListener('submit', (e) => {
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

        const users = getData('users') || [];
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            showToast('Username already exists', 'error');
            return;
        }

        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            showToast('Email already registered', 'error');
            return;
        }

        const newUser = {
            id: generateId('U'),
            username,
            password,
            name,
            email,
            role,
        };

        // If signing up as a donor, create a donor record too
        if (role === 'donor' && bloodGroup) {
            const donors = getData('donors') || [];
            const donorId = generateId('D');
            const newDonor = {
                id: donorId,
                name,
                email,
                phone: phone || '',
                bloodGroup,
                age: 0,
                gender: '',
                address: '',
                lastDonation: null,
                totalDonations: 0,
                totalLitres: 0,
                status: 'eligible',
                registered: new Date().toISOString().split('T')[0],
            };
            donors.push(newDonor);
            setData('donors', donors);
            newUser.donorId = donorId;
        }

        users.push(newUser);
        setData('users', users);
        showToast('Account created successfully! Please log in.', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
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
