import type { ContextMocks } from '../generate-preview'
import { deepMerge } from '../generate-preview'

type Mock = Record<string, unknown>
type States = Record<string, Mock>

/** Static FreeMarker scenarios. Null deliberately means absent to FreeMarker's ?? operator. */
export function addReviewScenarios(mocks: ContextMocks): void {
  const login = mocks.pages['login.ftl']
  const qr = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5x2KQAAAAASUVORK5CYII='
  mocks.pages['login-oid4vp.ftl'] = deepMerge(login, {
    crossDeviceQrCode: qr,
    crossDeviceWalletUrl: '#',
    crossDeviceStatusUrl: '#',
    sameDeviceWalletUrl: '#',
  })
  mocks.pages['oid4vc-credential-offer.ftl'] = deepMerge(login, {
    credentialDisplayName: 'Employee identity',
    credentialOffer: { qrCode: qr, uri: '#' },
  })

  const add = (page: string, states: States) => {
    const base = mocks.pages[page]
    if (!base)
      throw new Error(`Missing default mock: ${page}`)
    for (const [name, override] of Object.entries(states))
      mocks.pages[`${page}@${name}`] = deepMerge(base, override)
  }
  // These exercise template.ftl. Keep them on one representative page rather
  // than copying the same layout states into every page's scenario menu.
  add('login.ftl', {
    'alert-error': { message: { type: 'error', summary: 'We could not complete this request. Please check your details and try again.' } },
    'alert-warning': { isAppInitiatedAction: null, message: { type: 'warning', summary: 'Please complete this step to keep access to your account.' } },
    'alert-success': { message: { type: 'success', summary: 'Your changes have been saved successfully.' } },
    'alert-info': { message: { type: 'info', summary: 'Follow the instructions below to continue.' } },
    'long-content': {
      realm: { displayName: 'Example international organization with a particularly long realm name', displayNameHtml: 'Example international organization with a particularly long realm name' },
      message: { type: 'error', summary: 'A longer message to check wrapping and spacing. '.repeat(8) },
    },
    'no-language-switcher': { realm: { internationalizationEnabled: false } },
    'try-another-way': { auth: { showTryAnotherWayLink: true } },
  })
  for (const page of ['login.ftl', 'login-username.ftl']) {
    add(page, {
      'no-social-providers': { social: { providers: [], displayInfo: false } },
      'one-social-provider': { social: { providers: [{ alias: 'google', providerId: 'google', displayName: 'Google', loginUrl: '#' }] } },
      'many-social-providers': { social: { providers: Array.from({ length: 9 }, (_, i) => ({ alias: `provider-${i}`, providerId: 'oidc', displayName: `Organization identity provider ${i + 1}`, loginUrl: '#' })) } },
      'minimal': { realm: { rememberMe: false, registrationAllowed: false, resetPasswordAllowed: false }, social: { providers: [], displayInfo: false } },
      'email-as-username': { realm: { registrationEmailAsUsername: true } },
      'remembered-user': { login: { username: 'avery.long.username@example-organization.com', rememberMe: true } },
      'registration-disabled': { registrationDisabled: true },
      'social-only': { realm: { password: false } },
    })
  }
  add('login.ftl', { 'conditional-passkeys': { enableWebAuthnConditionalUI: true } })
  add('login-password.ftl', {
    'no-reset-password': { realm: { resetPasswordAllowed: false } },
    'identified-user': { auth: { showUsername: true, showResetCredentials: true, attemptedUsername: 'john.doe@example.com' } },
  })
  add('register.ftl', {
    'no-password': { passwordRequired: null },
    'no-terms': { termsAcceptanceRequired: null },
    'no-recaptcha': { recaptchaRequired: null },
    'terms-error': { messagesPerField: { termsAccepted: 'You must accept the terms to continue.' } },
    'password-confirm-error': { messagesPerField: { 'password-confirm': 'Passwords do not match.' } },
  })
  for (const page of ['register.ftl', 'login-update-profile.ftl', 'idp-review-user-profile.ftl', 'update-email.ftl']) {
    const profile = mocks.pages[page].profile as { attributes: Mock[] }
    add(page, {
      'profile-errors': { messagesPerField: { username: 'Username is already taken.', email: 'Enter a valid email address.', firstName: 'First name is required.', lastName: 'Last name is required.' } },
      'read-only-profile': { profile: { attributes: profile.attributes.map(attribute => ({ ...attribute, readOnly: true, value: 'Existing value', values: ['Existing value'] })) } },
    })
    for (const inputType of ['textarea', 'select', 'multiselect', 'select-radiobuttons', 'multiselect-checkboxes', 'html5-date', 'html5-number', 'text']) {
      const attribute = {
        name: 'customField',
        displayName: 'Additional profile information',
        required: true,
        readOnly: false,
        multivalued: inputType === 'text',
        value: 'one',
        values: ['one', 'two'],
        annotations: { inputType },
        html5DataAnnotations: {},
        validators: { options: { options: ['one', 'two', 'three'] } },
      }
      add(page, { [`profile-${inputType}`]: { profile: { attributes: [...profile.attributes, attribute] } } })
    }
  }
  for (const page of ['login-update-password.ftl', 'login-config-totp.ftl', 'login-recovery-authn-code-config.ftl', 'webauthn-register.ftl', 'webauthn-error.ftl', 'update-email.ftl', 'login-update-profile.ftl']) {
    add(page, { 'app-initiated': { isAppInitiatedAction: true }, 'required-action': { isAppInitiatedAction: null } })
  }
  add('login-config-totp.ftl', {
    'manual-hotp': { mode: 'manual', totp: { policy: { type: 'hotp', initialCounter: 0 } } },
    'existing-device': { totp: { otpCredentials: [{ id: 'otp-1', userLabel: 'Existing phone' }] } },
  })
  for (const [page, bean] of [['login-otp.ftl', 'otpLogin'], ['login-reset-otp.ftl', 'configuredOtpCredentials']]) {
    add(page, {
      'single-device': { [bean]: { userOtpCredentials: [{ id: 'otp-1', userLabel: 'My phone' }] } },
      'selected-device': { [bean]: { selectedCredentialId: 'otp-2', userOtpCredentials: [{ id: 'otp-1', userLabel: 'My phone' }, { id: 'otp-2', userLabel: 'Backup authenticator with a long name' }] } },
    })
  }
  add('login-otp.ftl', {
    'ten-devices': {
      otpLogin: {
        selectedCredentialId: 'otp-5',
        userOtpCredentials: Array.from({ length: 10 }, (_, index) => ({
          id: `otp-${index + 1}`,
          userLabel: index === 8 ? 'Backup authenticator on my personal laptop' : `Authenticator ${index + 1}`,
        })),
      },
    },
  })
  add('login-reset-password.ftl', {
    'email-login': { realm: { loginWithEmailAllowed: true } },
    'duplicate-emails': { realm: { loginWithEmailAllowed: true, duplicateEmailsAllowed: true } },
    'email-as-username': { realm: { registrationEmailAsUsername: true } },
  })
  add('info.ftl', {
    'no-link': { skipLink: true },
    'redirect-link': { pageRedirectUri: '#' },
    'client-link': { actionUri: null },
    'required-actions': { requiredActions: ['UPDATE_PASSWORD', 'VERIFY_EMAIL'], messageHeader: 'accountUpdatedMessage' },
  })
  add('error.ftl', { 'no-link': { skipLink: true }, 'trace-id': { traceId: 'example-trace-0123456789' } })
  add('code.ftl', { failure: { code: { success: false, error: 'Access denied.' } } })
  add('logout-confirm.ftl', { 'no-return-link': { logoutConfirm: { skipLink: true } } })
  add('frontchannel-logout.ftl', { 'return-link': { logout: { logoutRedirectUri: '#' } }, 'no-clients': { logout: { clients: [] } } })
  add('delete-account-confirm.ftl', { 'required-action': { triggered_from_aia: false } })
  add('login-idp-link-confirm.ftl', { 'hide-review': { hideReviewButton: true } })
  add('login-x509-info.ftl', { 'no-certificate': { x509: { formData: { subjectDN: null, isUserEnabled: null } } } })
  add('login-oauth-grant.ftl', {
    'client-details': { client: { name: 'Example application', attributes: { policyUri: '#', tosUri: '#' } } },
    'no-scopes': { oauth: { clientScopesRequested: [] } },
  })
  add('select-organization.ftl', { 'single-organization': { user: { organizations: [{ alias: 'acme', name: 'Acme Corporation' }] } } })
  add('select-authenticator.ftl', { 'single-method': { auth: { authenticationSelections: [{ authExecId: 'otp', displayName: 'Authenticator app', helpText: 'Use a one-time password.', iconCssClass: 'kcAuthenticatorOTPClass' }] } } })
  for (const page of ['webauthn-authenticate.ftl', 'login-passkeys-conditional-authenticate.ftl']) {
    add(page, {
      'known-authenticators': { shouldDisplayAuthenticators: true, isUserIdentified: 'true' },
      'no-registration': { realm: { registrationAllowed: false } },
      'passwordless': { realm: { password: false } },
    })
  }
  add('webauthn-register.ftl', { retry: { isSetRetry: true } })
  add('login-oid4vp.ftl', { 'same-device': { crossDeviceQrCode: '' }, 'cross-device': { sameDeviceWalletUrl: '' } })
  add('oid4vc-credential-offer.ftl', { 'no-cancel': { skipCancelButton: true } })
  add('saml-post-form.ftl', {
    request: { samlPost: { SAMLRequest: 'example-request', RelayState: 'example-relay' } },
    response: { samlPost: { SAMLResponse: 'example-response' } },
  })
}

/** A renderer failure must not silently remove a scenario from manual review. */
export function assertReviewCoverage(mocks: ContextMocks, pages: Record<string, Record<string, string>>): void {
  const uncovered = Object.keys(pages).filter(page => !mocks.pages[page.replace(/\.html$/, '.ftl')])
  if (uncovered.length)
    throw new Error(`Pages need explicit review fixtures:\n${uncovered.join('\n')}`)
  const missing = Object.keys(mocks.pages).filter((key) => {
    const [template, state = 'default'] = key.split('@')
    return !pages[template.replace(/\.ftl$/, '.html')]?.[state]
  })
  if (missing.length)
    throw new Error(`Review scenarios failed to render:\n${missing.join('\n')}`)
}
