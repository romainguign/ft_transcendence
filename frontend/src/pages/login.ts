import '../styles/login.css';
import { navigate } from '../router';
import { redirectAfterAuth, getQueryParam } from '../router';
import { languageService } from '../utils/languageContext';


interface LoginResponse {
    message: string;
    token: string;
}

export default function login() {
    const form = document.getElementById('login-form') as HTMLFormElement;
    const usernameField = document.getElementById('username') as HTMLInputElement;
    const passwordField = document.getElementById('password') as HTMLInputElement;
    const messageDiv = document.getElementById('message') as HTMLElement;
    const loginContainer = document.querySelector('.login-container') as HTMLElement;
    
    // Ajouter le bouton de connexion Google
    if (loginContainer && !document.getElementById('google-button')) {
        const googleButton = document.createElement('button');
        googleButton.type = 'button';
        googleButton.id = 'google-button';
        googleButton.className = 'oauth-button google-button';
        googleButton.innerHTML = `${languageService.translate('auth.login_with', 'Login with')} <img src="/assets/images/Google_Logo.png" alt="Google Logo">`;
        
        googleButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Open a popup window for Google auth
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            const popup = window.open(
                '/api/auth/google',
                'googleAuth',
                `width=${width},height=${height},left=${left},top=${top}`
            );
            
            // Set up an interval to check when the popup is closed
            const pollTimer = window.setInterval(() => {
                if (popup && popup.closed) {
                    window.clearInterval(pollTimer);
                    
                    // Check if authentication was successful by checking cookies or localStorage
                    const hasAuthCookie = document.cookie.split(';').some(item => 
                        item.trim().startsWith('auth_token=')
                    );
                    
                    if (hasAuthCookie) {
                        // Auth successful, update your app state
                        localStorage.setItem('token', 'authenticated');
                        messageDiv.textContent = 'Connexion réussie !';
                        messageDiv.classList.remove('error');
                        messageDiv.classList.add('success');
                        
                        // Navigate to home
                        window.history.pushState({}, "", '/home');
                        navigate();
                    }
                }
            }, 500);
        });
        
        const orSeparator = document.createElement('div');
        orSeparator.className = 'separator';
        orSeparator.innerHTML = `<span>${languageService.translate('auth.or', 'or')}</span>`;
        
        // Insérer avant le formulaire
        form.parentNode?.insertBefore(orSeparator, form);
        form.parentNode?.insertBefore(googleButton, orSeparator);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const username = usernameField.value;
        const password = passwordField.value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la connexion');
            }

            const data: LoginResponse = await response.json();

            localStorage.setItem('token', data.token); // Store the token
            redirectAfterAuth();

            messageDiv.textContent = 'Connexion réussie !';
            messageDiv.classList.remove('error');
            messageDiv.classList.add('success');

            localStorage.setItem('token', data.token);

        } catch (error: any) {
            messageDiv.textContent = error.message;
            messageDiv.classList.remove('success');
            messageDiv.classList.add('error');
        }
    });

    function updatePlaceholders() {
        const inputs = document.querySelectorAll('[data-i18n-placeholder]');
        inputs.forEach(input => {
          const key = input.getAttribute('data-i18n-placeholder');
          if (key) {
            (input as HTMLInputElement).placeholder = languageService.translate(key);
          }
        });
    }

    window.addEventListener('languageChanged', updatePlaceholders);

    updatePlaceholders();
    
    // Vérifier s'il y a une erreur dans l'URL (pour redirection après échec OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'auth_failed') {
        messageDiv.textContent = "L'authentification avec Google a échoué. Veuillez réessayer.";
        messageDiv.classList.remove('success');
        messageDiv.classList.add('error');
    }

    const signupLinkContainer = document.querySelector('.signup-link') as HTMLElement;
    if (signupLinkContainer) {
        // First, check if the link exists
        const existingLink = signupLinkContainer.querySelector('a[href="/register"]');
        
        // If the link doesn't exist, create it properly
        if (!existingLink) {
            const registerText = languageService.translate('auth.register', 'S\'inscrire');
            signupLinkContainer.innerHTML = `${languageService.translate('auth.no_account', 'Pas encore de compte ?')} <a href="/register" style="color: #BB70AD; font-weight: bold;">${registerText}</a>`;
        }
        
        // Make sure link is visible
        signupLinkContainer.style.display = 'block';
        signupLinkContainer.style.visibility = 'visible';
        signupLinkContainer.style.marginTop = '15px';
        signupLinkContainer.style.textAlign = 'center';
    }
}