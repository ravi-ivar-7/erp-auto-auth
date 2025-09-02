export const ERP_CONFIG = {
    BASE_URL: 'https://erp.iitkgp.ac.in',
    HOMEPAGE_URL: 'https://erp.iitkgp.ac.in/IIT_ERP3/',
    LOGIN_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/auth.htm',
    SECURITY_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/getSecurityQues.htm',
    OTP_URL: 'https://erp.iitkgp.ac.in/SSOAdministration/getEmilOTP.htm',
    WELCOMEPAGE_URL: 'https://erp.iitkgp.ac.in/IIT_ERP3/welcome.jsp',
    DASHBOARD_URL:   'https://erp.iitkgp.ac.in/IIT_ERP3/home.jsp'
};

export const GMAIL_CONFIG = {
    SCOPES: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'openid'
    ],
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
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


export const GITHUB_CONFIG = {
    REPOSITORY_URL: 'https://github.com/ravi-ivar-7/erp-auto-auth',
    ISSUES_URL: 'https://github.com/ravi-ivar-7/erp-auto-auth/issues',
    DISCUSSIONS_URL: 'https://github.com/ravi-ivar-7/erp-auto-auth/discussions',
    PRIVACY_POLICY_URL: 'https://github.com/ravi-ivar-7/erp-auto-auth/blob/master/docs/privacy.md',
    OAUTH_SETUP_URL: 'https://github.com/ravi-ivar-7/erp-auto-auth/blob/master/docs/google-oauth-setup.md'
};

export const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid roll number or password',
    CAPTCHA_FAILED: 'Captcha verification failed',
    OTP_TIMEOUT: 'OTP timeout - please try again',
    NETWORK_ERROR: 'Network connection failed',
    GMAIL_AUTH_FAILED: 'Gmail authentication failed'
};
