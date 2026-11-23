/* eslint-disable no-template-curly-in-string */
/**
 * Built-in preview states, merged on top of each page's base mock
 * (kc-base-mocks.ts). They cover the branches of the login templates that
 * the default mocks don't render; `npm run preview:coverage` shows what is
 * still uncovered. Many follow the Keycloakify storybook stories.
 *
 * A `null` value removes the attribute: the templates test many of them with
 * `??`, so "absent" and "false" render differently.
 */

type PageStates = Record<string, Record<string, Record<string, unknown>>>

const otpCredentials = [
  { id: 'otp-1', userLabel: 'Authenticator app' },
  { id: 'otp-2', userLabel: 'Backup device' },
]

const twoSocialProviders = [
  { alias: 'google', providerId: 'google', displayName: 'Google', loginUrl: '#', iconClasses: 'fa fa-google' },
  { alias: 'github', providerId: 'github', displayName: 'GitHub', loginUrl: '#', iconClasses: 'fa fa-github' },
]

const authenticators = {
  authenticators: [
    { credentialId: 'key-1', label: 'Security key', createdAt: 'Jan 5, 2026', transports: { iconClass: 'kcAuthenticatorUsbClass', displayNameProperties: ['usb', 'nfc'] } },
    { credentialId: 'key-2', label: 'Laptop', createdAt: 'Mar 2, 2026', transports: { iconClass: 'kcAuthenticatorDefaultClass', displayNameProperties: [] } },
  ],
}

/** Passkeys as Keycloak shows them with authenticator metadata (provider name and light/dark icons). */
const authenticatorsWithProvider = {
  authenticators: [
    { ...authenticators.authenticators[0], authenticatorProvider: 'YubiKey 5 Series', iconLight: 'yubico-light.svg', iconDark: 'yubico-dark.svg' },
    { ...authenticators.authenticators[1], authenticatorProvider: 'iCloud Keychain', iconLight: 'apple-light.svg' },
  ],
}

function attribute(name: string, displayName: string, extra: Record<string, unknown> = {}) {
  return { name, displayName, required: false, readOnly: false, annotations: {}, html5DataAnnotations: {}, validators: {}, values: [], ...extra }
}

const contactGroup = { name: 'contact', displayHeader: 'Contact details', displayDescription: 'How we can reach you.', html5DataAnnotations: {} }
const preferencesGroup = { name: 'preferences', html5DataAnnotations: {} }

/** One attribute per input type and annotation that user-profile-commons.ftl handles. */
const allFieldTypesProfile = {
  attributes: [
    attribute('username', '${username}', { required: true, value: 'johndoe' }),
    attribute('locale', 'Locale'),
    attribute('employeeId', 'Employee ID', { readOnly: true, value: 'E-1024' }),
    attribute('email', '${email}', {
      required: true,
      group: contactGroup,
      annotations: { inputType: 'html5-email', inputTypePlaceholder: 'name@example.com', inputHelperTextBefore: 'Use your work address.', inputHelperTextAfter: 'We never share it.' },
    }),
    attribute('phone', 'Phone', {
      group: contactGroup,
      annotations: { inputType: 'html5-tel', inputTypePattern: '[0-9+ ]+', inputTypeSize: '20', inputTypeMinlength: '6', inputTypeMaxlength: '20' },
    }),
    attribute('aliases', 'Aliases', { group: contactGroup, multivalued: true, values: ['jd', 'johnny'] }),
    attribute('age', 'Age', { group: preferencesGroup, annotations: { inputType: 'html5-number', inputTypeMin: '18', inputTypeMax: '120', inputTypeStep: '1' } }),
    attribute('bio', 'About you', { group: preferencesGroup, annotations: { inputType: 'textarea', inputTypeCols: '40', inputTypeRows: '4', inputTypeMaxlength: '500' } }),
    attribute('department', 'Department', { group: preferencesGroup, annotations: { inputType: 'select' }, validators: { options: { options: ['engineering', 'sales', 'support'] } } }),
    attribute('languages', 'Languages', { group: preferencesGroup, multivalued: true, values: ['en'], annotations: { inputType: 'multiselect' }, validators: { options: { options: ['en', 'de', 'fr'] } } }),
    attribute('contactMethod', 'Preferred contact', { group: preferencesGroup, annotations: { inputType: 'select-radiobuttons' }, validators: { options: { options: ['email', 'phone'] } } }),
    attribute('interests', 'Interests', { group: preferencesGroup, multivalued: true, values: ['news'], annotations: { inputType: 'multiselect-checkboxes', inputOptionLabels: { news: 'Newsletter', events: 'Event invitations' } }, validators: { options: { options: ['news', 'events'] } } }),
    attribute('team', 'Team', {
      group: preferencesGroup,
      annotations: { inputType: 'select', inputTypeSize: '3', inputOptionsFromValidation: 'teams', inputOptionLabelsI18nPrefix: 'team' },
      validators: { teams: { options: ['blue', 'green'] } },
    }),
    attribute('notes', 'Notes', { annotations: { inputType: 'textarea' } }),
    attribute('website', 'Website', { annotations: { inputType: 'url' } }),
  ],
}

/** The same form with every field read-only, as when an administrator locks attributes. */
const readOnlyProfile = {
  attributes: allFieldTypesProfile.attributes.map(field => ({ ...field, readOnly: true })),
}

/** Template-level branches (template.ftl): rendered on login.ftl, but apply to every page. */
const messageStates = {
  'message-success': { message: { type: 'success', summary: 'Your account has been updated.' } },
  'message-warning': { message: { type: 'warning', summary: 'Your password expires in 3 days.' } },
  'message-error': { message: { type: 'error', summary: 'The time allotted for the connection has elapsed. The login process will restart from the beginning.' } },
  'message-info': { message: { type: 'info', summary: 'Please re-authenticate to continue.' } },
}

export const kcPageStates: PageStates = {
  'login.ftl': {
    'minimal': {
      realm: { internationalizationEnabled: false, rememberMe: false, registrationAllowed: false, resetPasswordAllowed: false },
      social: { displayInfo: false, providers: [] },
      enableWebAuthnConditionalUI: null,
    },
    'invalid-credential': {
      login: { username: 'johndoe' },
      messagesPerField: { username: 'Invalid username or password.', password: 'Invalid username or password.' },
    },
    'invalid-state': {
      realm: { rememberMe: false, resetPasswordAllowed: false },
      social: { displayInfo: false, providers: [] },
      message: { type: 'info', summary: 'infoMessage' },
      messagesPerField: { username: 'Invalid username or password.', password: 'Invalid username or password.' },
    },
    'without-registration': { realm: { registrationAllowed: false } },
    'without-remember-me': { realm: { rememberMe: false } },
    'remember-me-checked': { login: { username: 'johndoe', rememberMe: 'on' } },
    'without-password-reset': { realm: { resetPasswordAllowed: false } },
    'username-only': { realm: { loginWithEmailAllowed: false } },
    'email-as-username': { realm: { loginWithEmailAllowed: true, registrationEmailAsUsername: true } },
    'preset-username': { login: { username: 'max.mustermann@example.com' } },
    're-authentication': {
      usernameHidden: true,
      auth: { attemptedUsername: 'max.mustermann@example.com', showUsername: true },
      message: { type: 'info', summary: 'Please re-authenticate to continue' },
    },
    're-authentication-error': {
      usernameHidden: true,
      auth: { attemptedUsername: 'max.mustermann@example.com', showUsername: true },
      messagesPerField: { password: 'Invalid password.' },
    },
    'without-password-field': { realm: { password: false } },
    'no-social-providers': { social: { displayInfo: true, providers: [] } },
    'one-social-provider': {
      social: { displayInfo: true, providers: [{ alias: 'google', providerId: 'google', displayName: 'Google', loginUrl: '#' }] },
    },
    'two-social-providers-with-icons': { social: { displayInfo: true, providers: twoSocialProviders } },
    'social-providers-without-remember-me': { realm: { rememberMe: false }, social: { displayInfo: true, providers: twoSocialProviders } },
    'selected-credential': { auth: { selectedCredential: 'key-1' } },
    'try-another-way': { auth: { showTryAnotherWayLink: true } },
    'switch-organization': { switchOrganizationEnabled: true },
    'session-check': { authenticationSession: { authSessionIdHash: 'preview-hash' } },
    'without-client': { client: null },
    'client-with-name': { client: { clientId: 'myApp', name: 'My Application', attributes: {} } },
    'dark-mode': { darkMode: true },
    're-authentication-username-only': {
      usernameHidden: true,
      realm: { loginWithEmailAllowed: false },
      auth: { attemptedUsername: 'johndoe', showUsername: true },
    },
    ...messageStates,
  },
  'login-username.ftl': {
    'invalid-username': { login: { username: 'johndoe' }, messagesPerField: { username: 'Invalid username.' } },
    'username-only': { realm: { loginWithEmailAllowed: false } },
    'email-as-username': { realm: { loginWithEmailAllowed: true, registrationEmailAsUsername: true } },
    're-authentication': { usernameHidden: true, auth: { attemptedUsername: 'johndoe', showUsername: true } },
    'remember-me-checked': { login: { username: 'johndoe', rememberMe: 'on' } },
    'without-password-field': { realm: { password: false } },
    'without-registration': { realm: { registrationAllowed: false } },
    'two-social-providers-with-icons': { social: { displayInfo: true, providers: twoSocialProviders } },
  },
  'login-password.ftl': {
    'invalid-password': { messagesPerField: { password: 'Invalid password.' } },
    'without-password-reset': { realm: { resetPasswordAllowed: false } },
    'try-another-way': { auth: { showTryAnotherWayLink: true } },
  },
  'register.ftl': {
    'field-errors': {
      messagesPerField: { username: 'Please specify username.', email: 'Invalid email address.', password: 'Please specify password.' },
    },
    'terms-not-accepted': { messagesPerField: { termsAccepted: 'You need to accept the terms and conditions.' } },
    'without-terms': { termsAcceptanceRequired: false },
    'without-password': { passwordRequired: false },
    'email-as-username': { realm: { registrationEmailAsUsername: true } },
    'with-recaptcha': { recaptchaRequired: true, recaptchaVisible: true, recaptchaSiteKey: 'preview-site-key' },
    'password-confirm-error': { messagesPerField: { 'password-confirm': 'Passwords do not match.' } },
    'message-header': { messageHeader: 'Create your account' },
    'terms-not-configured': { termsAcceptanceRequired: null },
    'all-field-types': { profile: allFieldTypesProfile },
    'all-field-types-with-errors': {
      profile: allFieldTypesProfile,
      messagesPerField: {
        phone: 'Invalid phone number.',
        bio: 'Too long.',
        department: 'Please select a department.',
        languages: 'Please select a language.',
        contactMethod: 'Please choose how we can contact you.',
        interests: 'Please choose at least one.',
      },
    },
    'all-field-types-read-only': { profile: readOnlyProfile },
  },
  'info.ftl': {
    'one-required-action': {
      message: { type: 'info', summary: 'You need to perform the following action' },
      requiredActions: ['UPDATE_PASSWORD'],
    },
    'several-required-actions': {
      message: { type: 'info', summary: 'You need to perform the following actions' },
      requiredActions: ['VERIFY_EMAIL', 'UPDATE_PROFILE', 'CONFIGURE_TOTP', 'UPDATE_PASSWORD'],
    },
    'without-required-actions': { requiredActions: null },
    'message-header': { messageHeader: 'Important notice', message: { type: 'info', summary: 'This is an important message.' } },
    'page-redirect': { pageRedirectUri: '#', message: { type: 'info', summary: 'You will be redirected shortly.' } },
    'back-to-client': { actionUri: null, message: { type: 'info', summary: 'Your account has been updated.' } },
    'without-link': { skipLink: true },
    'without-any-link': { actionUri: null, client: { baseUrl: null } },
  },
  'error.ftl': {
    'with-trace-id': { traceId: '7f3a2c91-preview' },
    'without-link': { skipLink: true },
    'without-client': { client: null },
    'html-message': { message: { type: 'error', summary: '<strong>Error:</strong> Something went wrong.' } },
  },
  'code.ftl': {
    error: { code: { success: false, error: 'Failed to generate the code.' } },
  },
  'delete-account-confirm.ftl': {
    'not-app-initiated': { triggered_from_aia: false },
  },
  'frontchannel-logout.ftl': {
    'with-redirect': { logout: { logoutRedirectUri: '#' } },
    'without-clients': { logout: { clients: [] } },
  },
  'login-config-totp.ftl': {
    'manual-setup': { mode: 'manual' },
    'counter-based': { mode: 'manual', totp: { policy: { type: 'hotp', initialCounter: 0 } } },
    'code-error': { messagesPerField: { totp: 'Invalid authenticator code.' } },
    'device-name-error': { messagesPerField: { userLabel: 'Please specify device name.' } },
    'second-device': { totp: { otpCredentials: [{ id: 'otp-1', userLabel: 'Authenticator app' }] } },
    'app-initiated': { isAppInitiatedAction: true },
  },
  'login-idp-link-confirm.ftl': {
    'without-review-button': { hideReviewButton: true },
  },
  'login-oauth-grant.ftl': {
    'client-with-logo-and-links': {
      client: { clientId: 'myApp', name: 'My Application', attributes: { logoUri: '#', tosUri: '#', policyUri: '#' } },
    },
    'client-with-terms-only': { client: { clientId: 'myApp', attributes: { tosUri: '#' } } },
    'client-with-policy-only': { client: { clientId: 'myApp', name: 'My Application', attributes: { policyUri: '#' } } },
    'parameterized-scope': {
      oauth: { clientScopesRequested: [{ consentScreenText: '${profileScopeConsentText}' }, { consentScreenText: 'Access to tenant', parameterizedScopeParameter: 'acme' }] },
    },
    'without-scopes': { oauth: { clientScopesRequested: null } },
  },
  'login-otp.ftl': {
    'code-error': { messagesPerField: { totp: 'Invalid authenticator code.' } },
    'selected-credential': { otpLogin: { userOtpCredentials: otpCredentials, selectedCredentialId: 'otp-2' } },
    'one-credential': { otpLogin: { userOtpCredentials: [{ id: 'otp-1', userLabel: 'Authenticator app' }] } },
  },
  'login-passkeys-conditional-authenticate.ftl': {
    'with-authenticators': { shouldDisplayAuthenticators: true, authenticators },
    'with-one-authenticator': { shouldDisplayAuthenticators: true, authenticators: { authenticators: [authenticators.authenticators[0]] } },
    'without-authenticators': { authenticators: null },
    'username-error': { messagesPerField: { username: 'Invalid username.' } },
    're-authentication': { usernameHidden: true },
    'without-password': { realm: { password: false } },
    'without-registration': { realm: { registrationAllowed: false } },
  },
  'login-recovery-authn-code-config.ftl': {
    'app-initiated': { isAppInitiatedAction: true },
  },
  'login-recovery-authn-code-input.ftl': {
    'code-error': { messagesPerField: { recoveryCodeInput: 'Invalid recovery code.' } },
  },
  'login-reset-password.ftl': {
    'username-or-email': { realm: { loginWithEmailAllowed: true, registrationEmailAsUsername: false } },
    'email-as-username': { realm: { loginWithEmailAllowed: true, registrationEmailAsUsername: true } },
    'username-error': { messagesPerField: { username: 'Please specify username.' } },
    'duplicate-emails-allowed': { realm: { duplicateEmailsAllowed: true } },
  },
  'login-update-password.ftl': {
    'password-error': { messagesPerField: { password: 'Password must contain at least 8 characters.' } },
    'confirmation-error': { messagesPerField: { 'password-confirm': 'Passwords don\'t match.' } },
    'app-initiated': { isAppInitiatedAction: true },
  },
  'login-update-profile.ftl': {
    'field-error': { messagesPerField: { email: 'Invalid email address.' } },
    'app-initiated': { isAppInitiatedAction: true },
  },
  'update-email.ftl': {
    'app-initiated': { isAppInitiatedAction: true },
  },
  'login-verify-email.ftl': {
    'with-email': { verifyEmail: 'john.doe@example.com' },
    'app-initiated': { isAppInitiatedAction: true },
    'app-initiated-with-email': { isAppInitiatedAction: true, verifyEmail: 'john.doe@example.com' },
  },
  'login-x509-info.ftl': {
    'without-subject': { x509: { formData: { subjectDN: null, isUserEnabled: true, username: 'john.doe' } } },
    'user-not-enabled': { x509: { formData: { subjectDN: 'CN=John Doe, O=Example Corp, C=US', isUserEnabled: null, username: 'john.doe' } } },
  },
  'webauthn-authenticate.ftl': {
    'with-authenticators': { shouldDisplayAuthenticators: true, authenticators },
    'with-authenticator-metadata': { shouldDisplayAuthenticators: true, authenticators: authenticatorsWithProvider },
    'with-authenticator-metadata-dark': { shouldDisplayAuthenticators: true, authenticators: authenticatorsWithProvider, darkMode: true },
    'with-one-authenticator': { shouldDisplayAuthenticators: true, authenticators: { authenticators: [authenticators.authenticators[0]] } },
    'without-authenticators': { authenticators: null },
  },
  'webauthn-error.ftl': {
    'not-app-initiated': { isAppInitiatedAction: null },
    'with-message': { message: { type: 'error', summary: 'WebAuthn authentication failed. Please try again.' } },
  },
  'webauthn-register.ftl': {
    'retry': { isSetRetry: true },
    'not-app-initiated': { isAppInitiatedAction: null },
    'app-initiated-first-attempt': { isSetRetry: null, isAppInitiatedAction: true },
  },
  'select-organization.ftl': {
    'one-organization': { user: { organizations: [{ alias: 'acme-inc', name: 'Acme Incorporated' }] } },
  },
  'logout-confirm.ftl': {
    'without-link': { logoutConfirm: { code: '123', skipLink: true } },
    'without-client-url': { client: { baseUrl: null } },
  },
  'saml-post-form.ftl': {
    request: { samlPost: { url: '#', SAMLRequest: 'PHNhbWxwOkF1dGhuUmVxdWVzdC8+', relayState: 'preview-state' } },
    response: { samlPost: { url: '#', SAMLResponse: 'PHNhbWxwOlJlc3BvbnNlLz4=' } },
  },
}
