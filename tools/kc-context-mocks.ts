import type { Attribute, KcContext } from 'keycloakify/login/KcContext'

const profileAttributes: Record<string, Omit<Attribute, 'group'>> = {
  username: {
    name: 'username',
    displayName: 'username',
    required: true,
    autocomplete: 'username',
    readOnly: false,
    annotations: {},
    validators: {
      length: { 'ignore.empty.value': true, min: '3', max: '255' },
    },
    values: [],
  },
  email: {
    name: 'email',
    displayName: 'email',
    required: true,
    autocomplete: 'email',
    readOnly: false,
    annotations: {},
    validators: {
      length: { max: '255', 'ignore.empty.value': true },
      email: { 'ignore.empty.value': true },
    },
    values: [],
  },
  firstName: {
    name: 'firstName',
    displayName: 'firstName',
    required: true,
    readOnly: false,
    annotations: {},
    validators: {
      length: { max: '255', 'ignore.empty.value': true },
    },
    values: [],
  },
  lastName: {
    name: 'lastName',
    displayName: 'lastName',
    required: true,
    readOnly: false,
    annotations: {},
    validators: {
      length: { max: '255', 'ignore.empty.value': true },
    },
    values: [],
  },
}

const userProfile = {
  attributesByName: profileAttributes,
  attributes: Object.values(profileAttributes),
  html5DataAnnotations: {},
}

const commonMock: KcContext.Common = {
  themeVersion: '0.0.0',
  keycloakifyVersion: '0.0.0',
  themeType: 'login',
  themeName: 'my-theme-name',
  url: {
    loginAction: '#',
    resourcesPath: '/keycloak-dev-resources',
    resourcesCommonPath: '/keycloak-dev-resources/resources-common',
    loginRestartFlowUrl: '#',
    loginUrl: '#',
    ssoLoginInOtherTabsUrl: '#',
  },
  realm: {
    name: 'myrealm',
    displayName: 'myrealm',
    displayNameHtml: 'myrealm',
    internationalizationEnabled: true,
    registrationEmailAsUsername: false,
  },
  auth: {
    showUsername: false,
    showResetCredentials: false,
    showTryAnotherWayLink: false,
  },
  client: {
    clientId: 'myApp',
    name: 'Client name',
    attributes: {},
  },
  scripts: [],
  locale: {
    supported: [
      { languageTag: 'en', label: 'English', url: '#' },
      { languageTag: 'de', label: 'Deutsch', url: '#' },
    ],
    currentLanguageTag: 'en',
  },
  messagesPerField: {
    printIfExists: (_fieldName, text) => text,
    existsError: () => false,
    get: () => '',
    exists: () => false,
    getFirstError: () => '',
  },
  properties: {},
  'x-keycloakify': {
    messages: {},
  },
}

const common: Record<string, unknown> = {
  ...commonMock,
  url: {
    ...commonMock.url,
    loginResetCredentialsUrl: '#',
    registrationUrl: '#',
    oauth2DeviceVerificationAction: '#',
    oauthAction: '#',
  },
  realm: {
    ...commonMock.realm,
    loginWithEmailAllowed: true,
    rememberMe: true,
    password: true,
    resetPasswordAllowed: true,
    registrationAllowed: true,
  },
  auth: {
    ...commonMock.auth,
    authenticationSelections: [],
  },
  login: {
    username: '',
    rememberMe: false,
  },
  locale: {
    ...commonMock.locale,
    current: 'English',
    rtl: false,
  },
  social: {
    displayInfo: true,
    providers: [
      { alias: 'google', providerId: 'google', displayName: 'Google', loginUrl: '#' },
      { alias: 'github', providerId: 'github', displayName: 'GitHub', loginUrl: '#' },
      { alias: 'facebook', providerId: 'facebook', displayName: 'Facebook', loginUrl: '#' },
      { alias: 'microsoft', providerId: 'microsoft', displayName: 'Microsoft', loginUrl: '#' },
    ],
  },
  totp: {
    totpSecretEncoded: 'KVVF G2BY N4YX S6LB IUYT K2LH IFYE 4SBV',
    qrUrl: '#',
    totpSecretQrCode: 'iVBORw0KGgoAAAANSUhEUgAAAPYAAAD2AQAAAADNaUdlAAACM0lEQVR4Xu3OIZJgOQwDUDFd2UxiurLAVnnbHw4YGDKtSiWOn4Gxf81//7r/+q8b4HfLGBZDK9d85NmNR+sB42sXvOYrN5P1DcgYYFTGfOlbzE8gzwy3euweGizw7cfdl34/GRhlkxjKNV+5AebPXPORX1JuB9x8ZfbyyD2y1krWAKsbMq1HnqQDaLfa77p4+MqvzEGSqvSAD/2IHW2yHaigR9tX3m8dDIYGcNf3f+gDpVBZbZU77zyJ6Rlcy+qoTMG887KAPD9hsh6a1Sv3gJUHGHUAxSMzj7zqDDe7Phmt2eG+8UsMxjRGm816MAO+8VMl1R1jGHOrZB/5Zo/WXAPgxixm9Mo96vDGrM1eOto8c4Ax4wF437mifOXlpiPzCnN7Y9l95NnEMxgMY9AAGA8fucH14Y1aVb6N/cqrmyh0BVht7k1e+bU8LK0Cg5vmVq9c5vHIjOfqxDIfeTraNVTwewa4wVe+SW5N+uP1qACeudUZbqGOfA6VZV750Noq2Xx3kpveV44ZelSV1V7KFHzkWyVrrlUwG0Pl9pWnoy3vsQoME6vKI69i5osVgwWzHT7zjmJtMcNUSVn1oYMd7ZodbgowZl45VG0uVuLPUr1yc79uaQBag/mqR34xhlWyHm1prplHboCWdZ4TeZjsK8+dI+jbz1C5hl65mcpgB5dhcj8+dGO+0Ko68+lD37JDD83dpDLzzK+TrQyaVwGj6pUboGV+7+AyN8An/pf84/7rv/4/1l4OCc/1BYMAAAAASUVORK5CYII=',
    manualUrl: '#',
    totpSecret: 'G4nsI8lQagRMUchH8jEG',
    otpCredentials: [],
    supportedApplications: ['FreeOTP', 'Google Authenticator'],
    policy: {
      algorithm: 'HmacSHA1',
      digits: 6,
      lookAheadWindow: 1,
      type: 'totp',
      period: 30,
    },
  },
  profile: userProfile,
}

type KcPageId = KcContext['pageId'] extends `${infer Name}.ftl` ? Name : never
type PageMocks = Partial<Record<KcPageId, Record<string, unknown>>> & Record<string, Record<string, unknown>>

const pageOverrides: PageMocks = {
  login: {
    authenticators: { authenticators: [] },
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: '0',
    isUserIdentified: 'false',
    shouldDisplayAuthenticators: false,
  },
  register: {
    url: { registrationAction: '#' },
    passwordRequired: true,
    recaptchaRequired: false,
  },
  info: {
    messageHeader: '<Message header>',
    requiredActions: null,
    skipLink: false,
    actionUri: '#',
    message: { type: 'info', summary: 'This is the info message from the server' },
    client: { clientId: 'myApp', baseUrl: '#', attributes: {} },
  },
  error: {
    message: { type: 'error', summary: 'This is the error message from the server' },
    client: { clientId: 'myApp', baseUrl: '#', attributes: {} },
  },
  'login-reset-password': {
    realm: { loginWithEmailAllowed: false, duplicateEmailsAllowed: false },
  },
  'login-verify-email': {
    user: { email: 'john.doe@gmail.com' },
  },
  'login-oauth2-device-verify-user-code': {},
  'login-oauth-grant': {
    oauth: {
      code: '5-1N4CIzfi1aprIQjmylI-9e3spLCWW9i5d-GDcs-Sw',
      client: 'account',
      clientScopesRequested: [
        { consentScreenText: 'User profile' },
        { consentScreenText: 'User roles' },
        { consentScreenText: 'Email address' },
      ],
    },
    client: { clientId: 'account', name: 'Account Console', attributes: {} },
  },
  'login-otp': {
    otpLogin: {
      userOtpCredentials: [
        { id: 'id1', userLabel: 'label1' },
        { id: 'id2', userLabel: 'label2' },
      ],
    },
  },
  'login-username': {
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: '0',
    isUserIdentified: 'false',
  },
  'login-password': {
    authenticators: { authenticators: [] },
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: '0',
    isUserIdentified: 'false',
    shouldDisplayAuthenticators: false,
  },
  'webauthn-authenticate': {
    authenticators: { authenticators: [] },
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: '0',
    isUserIdentified: 'false',
    shouldDisplayAuthenticators: false,
  },
  'link-idp-action': {
    idpDisplayName: 'ExampleConnect',
  },
  'login-idp-link-confirm': {
    idpAlias: 'ExampleConnect',
  },
  'login-idp-link-email': {
    idpAlias: 'ExampleConnect',
    brokerContext: { username: 'anUsername' },
  },
  'login-config-totp': {
    totp: {
      totpSecretEncoded: 'KVVF G2BY N4YX S6LB IUYT K2LH IFYE 4SBV',
      qrUrl: '#',
      totpSecretQrCode: String((common.totp as Record<string, unknown>).totpSecretQrCode ?? ''),
      manualUrl: '#',
      totpSecret: 'G4nsI8lQagRMUchH8jEG',
      otpCredentials: [],
      supportedApplications: ['FreeOTP', 'Google Authenticator'],
      policy: {
        algorithm: 'HmacSHA1',
        digits: 6,
        lookAheadWindow: 1,
        type: 'totp',
        period: 30,
      },
    },
  },
  'logout-confirm': {
    url: { logoutConfirmAction: '#' },
    logoutConfirm: { code: '123', skipLink: false },
    client: { clientId: 'myApp', baseUrl: '#', attributes: {} },
  },
  'idp-review-user-profile': {},
  'update-email': {
    profile: {
      attributesByName: { email: profileAttributes.email },
      attributes: [profileAttributes.email],
      html5DataAnnotations: {},
    },
  },
  'select-authenticator': {
    auth: {
      authenticationSelections: [
        {
          authExecId: 'f607f83c-537e-42b7-99d7-c52d459afe84',
          displayName: 'otp-display-name',
          helpText: 'otp-help-text',
          iconCssClass: 'kcAuthenticatorOTPClass',
        },
        {
          authExecId: '5ed881b1-84cd-4e9b-b4d9-f329ea61a58c',
          displayName: 'webauthn-display-name',
          helpText: 'webauthn-help-text',
          iconCssClass: 'kcAuthenticatorWebAuthnClass',
        },
      ],
    },
  },
  'saml-post-form': {
    samlPost: { url: '#' },
  },
  'frontchannel-logout': {
    logout: {
      clients: [
        { name: 'myApp', frontChannelLogoutUrl: '#' },
        { name: 'myApp2', frontChannelLogoutUrl: '#' },
      ],
    },
  },
  'webauthn-register': {
    challenge: 'random-challenge-string',
    userid: 'user123',
    username: 'johndoe',
    signatureAlgorithms: ['ES256', 'RS256'],
    rpEntityName: 'Example Corp',
    rpId: 'example.com',
    attestationConveyancePreference: 'direct',
    authenticatorAttachment: 'platform',
    requireResidentKey: 'required',
    userVerificationRequirement: 'preferred',
    createTimeout: 60000,
    excludeCredentialIds: 'credId123,credId456',
    isSetRetry: false,
    isAppInitiatedAction: true,
  },
  'delete-credential': {
    credentialLabel: 'myCredential',
  },
  code: {
    code: { success: true, code: '123456' },
  },
  'delete-account-confirm': {
    triggered_from_aia: true,
  },
  'login-recovery-authn-code-config': {
    recoveryAuthnCodesConfigBean: {
      generatedRecoveryAuthnCodesList: ['ABCD1234EFGH', 'JKLM5678NOPQ', 'RSTU9012VWXY'],
      generatedRecoveryAuthnCodesAsString: 'ABCD1234EFGH, JKLM5678NOPQ, RSTU9012VWXY',
      generatedAt: 1771490007604,
    },
  },
  'login-recovery-authn-code-input': {
    recoveryAuthnCodesInputBean: { codeNumber: 1234 },
  },
  'login-reset-otp': {
    configuredOtpCredentials: {
      userOtpCredentials: [
        { id: 'otpId1', userLabel: 'OTP Device 1' },
        { id: 'otpId2', userLabel: 'OTP Device 2' },
        { id: 'otpId3', userLabel: 'Backup OTP' },
      ],
      selectedCredentialId: 'otpId2',
    },
  },
  'login-x509-info': {
    x509: {
      formData: {
        subjectDN: 'CN=John Doe, O=Example Corp, C=US',
        isUserEnabled: true,
        username: 'johndoe',
      },
    },
  },
  'webauthn-error': {
    isAppInitiatedAction: true,
  },
  'login-passkeys-conditional-authenticate': {
    authenticators: { authenticators: [] },
    challenge: '',
    userVerification: 'not specified',
    rpId: '',
    createTimeout: 0,
    isUserIdentified: 'false',
    shouldDisplayAuthenticators: false,
  },
  'login-idp-link-confirm-override': {
    idpDisplayName: 'Google',
    url: { loginRestartFlowUrl: '#' },
  },
  'select-organization': {
    user: {
      organizations: [
        { alias: 'acme-inc', name: 'Acme Incorporated' },
        { alias: 'northwind-traders', name: 'Northwind Traders' },
        { alias: 'contoso-labs', name: 'Contoso Labs' },
        { alias: 'shared-services', name: 'Shared Services' },
      ],
    },
  },
  'mock-extension-showcase': {
    mockExtensionTitle: 'KcContext mock extension showcase',
    mockExtensionIntro: 'This custom page demonstrates user-extensible mock fields rendered by a custom FTL template.',
    mockExtensionSteps: '1) Checkout repository locally\n2) Add custom FTL page\n3) Provide page mocks\n4) Style in editor',
  },
}

const pageMocks: KcContext[] = Object.entries(pageOverrides).map(([pageName, pageOverride]) => {
  return {
    ...commonMock,
    ...(pageOverride as Record<string, unknown>),
    pageId: `${pageName}.ftl` as KcContext['pageId'],
  } as KcContext
})

void pageMocks

export interface ContextMocks {
  common: Record<string, unknown>
  pages: Record<string, Record<string, unknown>>
}

export function resolveContextMocks(): ContextMocks {
  return {
    common,
    pages: pageOverrides,
  }
}
