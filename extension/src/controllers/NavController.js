export class NavController {
    constructor(app) {
        this.app = app;
        this.currentScreen = null;
    }

    async init() {
        this.setupNavEventListeners();
    }

    async loadNavbar() {
        try {
            const navContainer = document.getElementById('navbar-container');
            if (navContainer.innerHTML) return;
            
            const response = await fetch('components/navbar.html');
            if (!response.ok) throw new Error('Failed to load navbar');
            
            const html = await response.text();
            navContainer.innerHTML = html;
            
            this.setupNavEventListeners();
        } catch (error) {
            console.error('Failed to load navbar:', error);
        }
    }

    setupNavEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-item') || e.target.closest('.nav-item')) {
                const navItem = e.target.matches('.nav-item') ? e.target : e.target.closest('.nav-item');
                const screen = navItem.dataset.screen;
                if (screen) {
                    this.navigateToScreen(screen);
                }
            }
            if (e.target.matches('.navbar-title') || e.target.closest('.navbar-title')) {
                window.location.reload();
            }
        });
    }

    navigateToScreen(screenName) {
        this.app.navigateToScreen(screenName);
    }

    setActiveScreen(screenName) {
        this.currentScreen = screenName;
        
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.screen === screenName) {
                item.classList.add('active');
            }
        });
    }

    hideNavbar() {
        const navContainer = document.getElementById('navbar-container');
        navContainer.style.display = 'none';
    }

    showNavbar() {
        const navContainer = document.getElementById('navbar-container');
        navContainer.style.display = 'block';
    }
}
