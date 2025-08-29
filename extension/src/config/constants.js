export const ERP_CONFIG = {
    BASE_URL: 'https://erp.iitkgp.ac.in',
    HOMEPAGE_URL: 'https://erp.iitkgp.ac.in/IIT_ERP3/',
    LOGIN_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/auth.htm',
    SECURITY_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/getSecurityQues.htm',
    OTP_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/getEmilOTP.htm',
    WELCOMEPAGE_URL: 'https://erp.iitkgp.ac.in/IIT_ERP3/welcome.jsp',
    DASHBOARD_URL: 'https://erp.iitkgp.ac.in/IIT_ERP3/home.jsp'
};

export const GMAIL_CONFIG = {
    SCOPES: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'openid'
    ],
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
    DEFAULT_CLIENT_ID: '87033747871-houf0a0g47ei5e4l7s0v4ssu5lt5c6qv.apps.googleusercontent.com',
    OTP_SEARCH_QUERY: 'from:erpkgp@adm.iitkgp.ac.in'
};

export const STORAGE_KEYS = {
    USER_DATA: 'user_data',
    GMAIL_DATA: 'gmail_data',
    LAST_LOGIN: 'last_login',
    ERP_SESSION: 'erp_session'
};

export const UI_CONFIG = {
    WINDOW_WIDTH: 480,
    WINDOW_HEIGHT: 600,
    ANIMATION_DURATION: 300,
    OTP_TIMEOUT: 300000
};


export const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid roll number or password',
    CAPTCHA_FAILED: 'Captcha verification failed',
    OTP_TIMEOUT: 'OTP timeout - please try again',
    NETWORK_ERROR: 'Network connection failed',
    GMAIL_AUTH_FAILED: 'Gmail authentication failed'
};
