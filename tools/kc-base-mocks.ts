/* eslint-disable no-template-curly-in-string */
import type { KnownPageId } from './kc-page-ids'

const locale = {
  supported: [
    { languageTag: 'en', label: 'English', url: '#' },
    { languageTag: 'de', label: 'Deutsch', url: '#' },
  ],
  currentLanguageTag: 'en',
}

const url = {
  loginAction: '#',
  resourcesPath: '/keycloak-dev-resources',
  resourcesCommonPath: '/keycloak-dev-resources/resources-common',
  loginRestartFlowUrl: '#',
  loginUrl: '#',
  ssoLoginInOtherTabsUrl: '#',
}

const loginUrl = {
  ...url,
  loginResetCredentialsUrl: '#',
  registrationUrl: '#',
  oauth2DeviceVerificationAction: '#',
  oauthAction: '#',
}

const realm = {
  name: 'myrealm',
  displayName: 'myrealm',
  displayNameHtml: 'myrealm',
  internationalizationEnabled: true,
  registrationEmailAsUsername: false,
}

const loginRealm = {
  ...realm,
  loginWithEmailAllowed: true,
  rememberMe: true,
  password: true,
  resetPasswordAllowed: true,
  registrationAllowed: true,
}

const profileAttributes = {
  username: {
    name: 'username',
    displayName: '${username}',
    required: true,
    readOnly: false,
    autocomplete: 'username',
    annotations: {},
    validators: { length: { 'min': 3, 'max': 255, 'ignore.empty.value': true } },
  },
  email: {
    name: 'email',
    displayName: '${email}',
    required: true,
    readOnly: false,
    autocomplete: 'email',
    annotations: {},
    validators: {
      length: { 'max': 255, 'ignore.empty.value': true },
      email: { 'ignore.empty.value': true },
    },
  },
  firstName: {
    name: 'firstName',
    displayName: '${firstName}',
    required: true,
    readOnly: false,
    annotations: {},
    validators: { length: { 'max': 255, 'ignore.empty.value': true } },
  },
  lastName: {
    name: 'lastName',
    displayName: '${lastName}',
    required: true,
    readOnly: false,
    annotations: {},
    validators: { length: { 'max': 255, 'ignore.empty.value': true } },
  },
}

const defaultProfileAttributes = [
  { name: 'username', displayName: '${username}', required: true, readOnly: false, autocomplete: 'username', annotations: {}, html5DataAnnotations: {}, validators: {}, values: [], value: '' },
  { name: 'email', displayName: '${email}', required: true, readOnly: false, autocomplete: 'email', annotations: {}, html5DataAnnotations: {}, validators: {}, values: [], value: '' },
  { name: 'firstName', displayName: '${firstName}', required: true, readOnly: false, annotations: {}, html5DataAnnotations: {}, validators: {}, values: [], value: '' },
  { name: 'lastName', displayName: '${lastName}', required: true, readOnly: false, annotations: {}, html5DataAnnotations: {}, validators: {}, values: [], value: '' },
]

const profile = {
  attributes: defaultProfileAttributes,
  attributesByName: profileAttributes,
  html5DataAnnotations: {},
}

const common = {
  url,
  realm,
  messagesPerField: {},
  locale,
  auth: {
    showUsername: false,
    showResetCredentials: false,
    showTryAnotherWayLink: false,
  },
  client: {
    clientId: 'myApp',
    attributes: {},
  },
  scripts: [],
  isAppInitiatedAction: false,
  properties: {},
}

const authenticators = { authenticators: [] }
const otpCredentials = [
  { id: 'otp-1', userLabel: 'Authenticator app' },
  { id: 'otp-2', userLabel: 'Backup device' },
]
const socialProviders = [
  { alias: 'google', providerId: 'google', displayName: 'Google', loginUrl: '#' },
  { alias: 'github', providerId: 'github', displayName: 'GitHub', loginUrl: '#' },
  { alias: 'facebook', providerId: 'facebook', displayName: 'Facebook', loginUrl: '#' },
  { alias: 'microsoft', providerId: 'microsoft', displayName: 'Microsoft', loginUrl: '#' },
]

type BaseMocksByPage = Record<KnownPageId, Record<string, unknown>>

const kcBaseMocks = {
  'login.ftl': {
    ...common,
    pageId: 'login.ftl',
    url: loginUrl,
    realm: loginRealm,
    social: { displayInfo: true, providers: socialProviders },
    login: { username: '' },
    registrationDisabled: false,
    enableWebAuthnConditionalUI: false,
    authenticators,
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: '0',
    isUserIdentified: 'false',
    shouldDisplayAuthenticators: false,
  },
  'register.ftl': {
    ...common,
    pageId: 'register.ftl',
    url: { ...loginUrl, registrationAction: '#' },
    passwordRequired: true,
    recaptchaRequired: false,
    termsAcceptanceRequired: true,
    profile: {
      ...profile,
      attributesByName: {
        ...profile.attributesByName,
        email: { ...profileAttributes.email, readOnly: true, values: ['john@example.com'] },
        lastName: { ...profileAttributes.lastName, readOnly: true, values: ['Doe'] },
        favoritePet: {
          name: 'favoritePet',
          displayName: 'Favorite pet',
          required: true,
          readOnly: false,
          annotations: { inputType: 'select', inputOptionLabelsI18nPrefix: 'favoritePet' },
          html5DataAnnotations: {},
          validators: { options: { options: ['dog', 'cat', 'bird', 'reptile'] } },
          values: [],
        },
      },
    },
  },
  'info.ftl': {
    ...common,
    pageId: 'info.ftl',
    messageHeader: '<Message header>',
    requiredActions: [],
    actionUri: '#',
    client: { ...common.client, baseUrl: '#' },
    message: { type: 'info', summary: 'Informational message from the server.' },
  },
  'error.ftl': {
    ...common,
    pageId: 'error.ftl',
    client: { ...common.client, baseUrl: '#' },
    message: { type: 'error', summary: 'An error message from the server.' },
  },
  'login-reset-password.ftl': {
    ...common,
    pageId: 'login-reset-password.ftl',
    url: loginUrl,
    realm: { ...realm, loginWithEmailAllowed: false, duplicateEmailsAllowed: false },
    auth: {},
  },
  'login-verify-email.ftl': {
    ...common,
    pageId: 'login-verify-email.ftl',
    user: { email: 'john.doe@example.com' },
  },
  'terms.ftl': {
    ...common,
    pageId: 'terms.ftl',
  },
  'login-oauth2-device-verify-user-code.ftl': {
    ...common,
    pageId: 'login-oauth2-device-verify-user-code.ftl',
    url: loginUrl,
  },
  'login-oauth-grant.ftl': {
    ...common,
    pageId: 'login-oauth-grant.ftl',
    url: loginUrl,
    oauth: {
      code: 'example-consent-code',
      client: 'account',
      clientScopesRequested: [
        { consentScreenText: '${profileScopeConsentText}' },
        { consentScreenText: '${emailScopeConsentText}' },
      ],
    },
  },
  'login-otp.ftl': {
    ...common,
    pageId: 'login-otp.ftl',
    otpLogin: { userOtpCredentials: otpCredentials },
  },
  'login-username.ftl': {
    ...common,
    pageId: 'login-username.ftl',
    url: loginUrl,
    realm: loginRealm,
    social: { displayInfo: true, providers: socialProviders },
    login: { username: '' },
    registrationDisabled: false,
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: '0',
    isUserIdentified: 'false',
  },
  'login-password.ftl': {
    ...common,
    pageId: 'login-password.ftl',
    url: loginUrl,
    realm: { ...realm, resetPasswordAllowed: true },
    enableWebAuthnConditionalUI: false,
    authenticators,
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: '0',
    isUserIdentified: 'false',
    shouldDisplayAuthenticators: false,
  },
  'webauthn-authenticate.ftl': {
    ...common,
    pageId: 'webauthn-authenticate.ftl',
    url: loginUrl,
    realm: { ...realm, password: true, registrationAllowed: true },
    authenticators,
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: '0',
    isUserIdentified: 'false',
    shouldDisplayAuthenticators: false,
  },
  'webauthn-register.ftl': {
    ...common,
    pageId: 'webauthn-register.ftl',
    challenge: 'random-challenge-string',
    userid: 'user-123',
    username: 'john.doe',
    signatureAlgorithms: ['ES256', 'RS256'],
    rpEntityName: 'Example Corp',
    rpId: 'example.com',
    attestationConveyancePreference: 'direct',
    authenticatorAttachment: 'platform',
    requireResidentKey: 'required',
    userVerificationRequirement: 'preferred',
    createTimeout: 60000,
    excludeCredentialIds: 'cred-1,cred-2',
    isSetRetry: false,
    isAppInitiatedAction: true,
  },
  'login-update-password.ftl': {
    ...common,
    pageId: 'login-update-password.ftl',
  },
  'link-idp-action.ftl': {
    ...common,
    pageId: 'link-idp-action.ftl',
    idpDisplayName: 'Identity Provider',
  },
  'login-update-profile.ftl': {
    ...common,
    pageId: 'login-update-profile.ftl',
    profile,
  },
  'login-idp-link-confirm.ftl': {
    ...common,
    pageId: 'login-idp-link-confirm.ftl',
    idpAlias: 'google',
  },
  'login-idp-link-email.ftl': {
    ...common,
    pageId: 'login-idp-link-email.ftl',
    idpAlias: 'google',
    brokerContext: { username: 'john.doe' },
  },
  'login-page-expired.ftl': {
    ...common,
    pageId: 'login-page-expired.ftl',
  },
  'login-config-totp.ftl': {
    ...common,
    pageId: 'login-config-totp.ftl',
    totp: {
      totpSecretEncoded: 'ABCD EFGH IJKL MNOP',
      qrUrl: '#',
      policy: { algorithm: 'HmacSHA1', digits: 6, lookAheadWindow: 1, type: 'totp', period: 30 },
      supportedApplications: ['FreeOTP', 'Google Authenticator'],
      totpSecretQrCode: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5x2KQAAAAASUVORK5CYII=',
      manualUrl: '#',
      totpSecret: 'G4NS-I8LQ-AGRM-UCHH',
      otpCredentials: [],
    },
  },
  'logout-confirm.ftl': {
    ...common,
    pageId: 'logout-confirm.ftl',
    url: { ...url, logoutConfirmAction: '#' },
    client: { ...common.client, baseUrl: '#' },
    logoutConfirm: { code: '123', skipLink: false },
  },
  'idp-review-user-profile.ftl': {
    ...common,
    pageId: 'idp-review-user-profile.ftl',
    profile,
  },
  'update-email.ftl': {
    ...common,
    pageId: 'update-email.ftl',
    profile,
  },
  'select-authenticator.ftl': {
    ...common,
    pageId: 'select-authenticator.ftl',
    auth: {
      authenticationSelections: [
        { authExecId: 'otp', displayName: 'Authenticator app', helpText: 'Use a one-time password.', iconCssClass: 'kcAuthenticatorOTPClass' },
        { authExecId: 'webauthn', displayName: 'Security key', helpText: 'Use a hardware or platform authenticator.', iconCssClass: 'kcAuthenticatorWebAuthnClass' },
      ],
    },
  },
  'saml-post-form.ftl': {
    ...common,
    pageId: 'saml-post-form.ftl',
    samlPost: { url: '#' },
  },
  'delete-credential.ftl': {
    ...common,
    pageId: 'delete-credential.ftl',
    credentialLabel: 'Authenticator app',
  },
  'code.ftl': {
    ...common,
    pageId: 'code.ftl',
    code: { success: true, code: '123456' },
  },
  'delete-account-confirm.ftl': {
    ...common,
    pageId: 'delete-account-confirm.ftl',
    triggered_from_aia: true,
  },
  'frontchannel-logout.ftl': {
    ...common,
    pageId: 'frontchannel-logout.ftl',
    logout: {
      clients: [
        { name: 'myApp', frontChannelLogoutUrl: '#' },
        { name: 'partnerApp', frontChannelLogoutUrl: '#' },
      ],
    },
  },
  'login-recovery-authn-code-config.ftl': {
    ...common,
    pageId: 'login-recovery-authn-code-config.ftl',
    recoveryAuthnCodesConfigBean: {
      generatedRecoveryAuthnCodesList: ['ABCD1234EFGH', 'IJKL5678MNOP', 'QRST9012UVWX'],
      generatedRecoveryAuthnCodesAsString: 'ABCD1234EFGH, IJKL5678MNOP, QRST9012UVWX',
      generatedAt: 1735689600000,
    },
  },
  'login-recovery-authn-code-input.ftl': {
    ...common,
    pageId: 'login-recovery-authn-code-input.ftl',
    recoveryAuthnCodesInputBean: { codeNumber: 1234 },
  },
  'login-reset-otp.ftl': {
    ...common,
    pageId: 'login-reset-otp.ftl',
    configuredOtpCredentials: {
      userOtpCredentials: [
        { id: 'otp-1', userLabel: 'Authenticator app' },
        { id: 'otp-2', userLabel: 'Backup device' },
        { id: 'otp-3', userLabel: 'Emergency codes' },
      ],
      selectedCredentialId: 'otp-2',
    },
  },
  'login-x509-info.ftl': {
    ...common,
    pageId: 'login-x509-info.ftl',
    x509: {
      formData: {
        subjectDN: 'CN=John Doe, O=Example Corp, C=US',
        isUserEnabled: true,
        username: 'john.doe',
      },
    },
  },
  'webauthn-error.ftl': {
    ...common,
    pageId: 'webauthn-error.ftl',
    isAppInitiatedAction: true,
  },
  'login-passkeys-conditional-authenticate.ftl': {
    ...common,
    pageId: 'login-passkeys-conditional-authenticate.ftl',
    url: { ...url, registrationUrl: '#' },
    realm: { ...realm, password: true, registrationAllowed: true },
    registrationDisabled: false,
    isUserIdentified: 'false',
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: 0,
    authenticators,
    shouldDisplayAuthenticators: false,
    login: {},
  },
  'login-idp-link-confirm-override.ftl': {
    ...common,
    pageId: 'login-idp-link-confirm-override.ftl',
    idpDisplayName: 'Google',
  },
  'select-organization.ftl': {
    ...common,
    pageId: 'select-organization.ftl',
    user: {
      organizations: [
        { alias: 'acme-inc', name: 'Acme Incorporated' },
        { alias: 'northwind-traders', name: 'Northwind Traders' },
        { alias: 'shared-services', name: 'Shared Services' },
        { alias: 'dev-sandbox', name: 'Dev Sandbox' },
      ],
    },
  },
} satisfies BaseMocksByPage

export default kcBaseMocks
