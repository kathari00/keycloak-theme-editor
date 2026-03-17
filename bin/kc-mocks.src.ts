import type { KnownPageId } from '../tools/kc-page-ids'

export type { KnownPageId } from '../tools/kc-page-ids'

export type Primitive = string | number | boolean | null | undefined
export type ConfigValue = Primitive | ConfigValue[] | { [key: string]: ConfigValue }

type Extendable<T extends object> = T & Record<string & {}, unknown>
type CustomPageId = `${string}.ftl`
export type PageId = KnownPageId | CustomPageId | (string & {})

export interface LocaleOptionOverride {
  languageTag?: string
  label?: string
  url?: string
}

export interface LocaleOverride {
  supported?: LocaleOptionOverride[]
  currentLanguageTag?: string
  rtl?: boolean
}

export interface RealmOverride {
  name?: string
  displayName?: string
  displayNameHtml?: string
  internationalizationEnabled?: boolean
  registrationEmailAsUsername?: boolean
  loginWithEmailAllowed?: boolean
  rememberMe?: boolean
  password?: boolean
  resetPasswordAllowed?: boolean
  registrationAllowed?: boolean
  duplicateEmailsAllowed?: boolean
  attributes?: Record<string, string>
}

export interface UrlOverride {
  loginAction?: string
  resourcesPath?: string
  resourcesCommonPath?: string
  loginRestartFlowUrl?: string
  loginUrl?: string
  ssoLoginInOtherTabsUrl?: string
  loginResetCredentialsUrl?: string
  registrationUrl?: string
  oauth2DeviceVerificationAction?: string
  oauthAction?: string
  registrationAction?: string
  logoutConfirmAction?: string
}

export interface AuthenticationSelectionOverride {
  authExecId?: string
  displayName?: string
  helpText?: string
  iconCssClass?: string
}

export interface AuthOverride {
  showUsername?: boolean
  showResetCredentials?: boolean
  showTryAnotherWayLink?: boolean
  attemptedUsername?: string
  selectedCredential?: string
  authenticationSelections?: AuthenticationSelectionOverride[]
}

export interface MessageOverride {
  type?: 'success' | 'warning' | 'error' | 'info'
  summary?: string
}

export interface ClientOverride {
  clientId?: string
  name?: string
  description?: string
  baseUrl?: string
  attributes?: Record<string, string>
}

export interface SocialProviderOverride {
  loginUrl?: string
  alias?: string
  providerId?: string
  displayName?: string
  iconClasses?: string
}

export interface SocialOverride {
  displayInfo?: boolean
  providers?: SocialProviderOverride[]
}

export interface WebauthnTransportOverride {
  iconClass?: string
  displayNameProperties?: string[]
}

export interface WebauthnAuthenticatorOverride {
  credentialId?: string
  label?: string
  createdAt?: string
  transports?: WebauthnTransportOverride
}

export interface AttributeGroupOverride {
  annotations?: Record<string, string>
  html5DataAnnotations?: Record<string, string>
  name?: string
  displayHeader?: string
  displayDescription?: string
}

export interface ValidatorsOverride {
  length?: { 'min'?: number | string, 'max'?: number | string, 'ignore.empty.value'?: boolean }
  integer?: { 'min'?: number | string, 'max'?: number | string, 'ignore.empty.value'?: boolean }
  email?: { 'ignore.empty.value'?: boolean }
  pattern?: { 'pattern'?: string, 'ignore.empty.value'?: boolean, 'error-message'?: string }
  options?: { options?: string[] }
  multivalued?: { 'min'?: number | string, 'max'?: number | string, 'ignore.empty.value'?: boolean }
}

export interface AttributeOverride {
  name?: string
  displayName?: string
  required?: boolean
  readOnly?: boolean
  value?: string
  values?: string[]
  group?: AttributeGroupOverride
  html5DataAnnotations?: Record<string, string>
  validators?: ValidatorsOverride
  annotations?: Record<string, string | number | undefined>
  multivalued?: boolean
  autocomplete?: string
}

export interface UserProfileOverride {
  attributes?: Array<AttributeOverride>
  attributesByName?: Record<string, AttributeOverride>
  html5DataAnnotations?: Record<string, string>
}

export interface PasswordPoliciesOverride {
  length?: number
  maxLength?: number
  digits?: number
  lowerCase?: number
  upperCase?: number
  specialChars?: number
  notUsername?: boolean
  notEmail?: boolean
}

export type CommonPageOverride = Extendable<{
  pageId?: string
  url?: UrlOverride
  realm?: RealmOverride
  messagesPerField?: Record<string, string>
  locale?: LocaleOverride
  auth?: AuthOverride
  scripts?: string[]
  message?: MessageOverride
  client?: ClientOverride
  isAppInitiatedAction?: boolean
  properties?: Record<string, string>
}>

interface AuthenticatorCollectionOverride {
  authenticators?: WebauthnAuthenticatorOverride[]
}

interface OtpCredentialOverride {
  id?: string
  userLabel?: string
}

type LoginLikeOverride = Extendable<{
  login?: {
    username?: string
    rememberMe?: string
    password?: string
  }
  usernameHidden?: boolean
  social?: SocialOverride
  registrationDisabled?: boolean
  enableWebAuthnConditionalUI?: boolean
  authenticators?: AuthenticatorCollectionOverride
  challenge?: string
  userVerification?: string
  rpId?: string
  createTimeout?: number | string
  isUserIdentified?: boolean | 'true' | 'false'
  shouldDisplayAuthenticators?: boolean
}>

export interface PageOverrideById {
  'login.ftl': CommonPageOverride & LoginLikeOverride
  'register.ftl': CommonPageOverride & Extendable<{
    profile?: UserProfileOverride
    passwordPolicies?: PasswordPoliciesOverride
    passwordRequired?: boolean
    recaptchaRequired?: boolean
    recaptchaVisible?: boolean
    recaptchaSiteKey?: string
    recaptchaAction?: string
    termsAcceptanceRequired?: boolean
    messageHeader?: string
  }>
  'info.ftl': CommonPageOverride & Extendable<{
    messageHeader?: string
    requiredActions?: string[]
    skipLink?: boolean
    pageRedirectUri?: string
    actionUri?: string
    message?: MessageOverride
  }>
  'error.ftl': CommonPageOverride & Extendable<{
    skipLink?: boolean
    message?: MessageOverride
  }>
  'login-reset-password.ftl': CommonPageOverride
  'login-verify-email.ftl': CommonPageOverride & Extendable<{
    user?: { email?: string }
  }>
  'terms.ftl': CommonPageOverride & Extendable<{
    user?: { id?: string, username?: string, email?: string }
  }>
  'login-oauth2-device-verify-user-code.ftl': CommonPageOverride
  'login-oauth-grant.ftl': CommonPageOverride & Extendable<{
    oauth?: {
      code?: string
      client?: string
      clientScopesRequested?: Array<{
        consentScreenText?: string
        dynamicScopeParameter?: string
      }>
    }
  }>
  'login-otp.ftl': CommonPageOverride & Extendable<{
    otpLogin?: {
      userOtpCredentials?: OtpCredentialOverride[]
      selectedCredentialId?: string
    }
  }>
  'login-username.ftl': CommonPageOverride & LoginLikeOverride
  'login-password.ftl': CommonPageOverride & Extendable<{
    enableWebAuthnConditionalUI?: boolean
    authenticators?: AuthenticatorCollectionOverride
    challenge?: string
    userVerification?: string
    rpId?: string
    createTimeout?: number | string
    isUserIdentified?: boolean | 'true' | 'false'
    shouldDisplayAuthenticators?: boolean
  }>
  'webauthn-authenticate.ftl': CommonPageOverride & Extendable<{
    authenticators?: AuthenticatorCollectionOverride
    challenge?: string
    userVerification?: string
    rpId?: string
    createTimeout?: number | string
    isUserIdentified?: boolean | 'true' | 'false'
    shouldDisplayAuthenticators?: boolean
    registrationDisabled?: boolean
  }>
  'webauthn-register.ftl': CommonPageOverride & Extendable<{
    challenge?: string
    userid?: string
    username?: string
    signatureAlgorithms?: string[]
    rpEntityName?: string
    rpId?: string
    attestationConveyancePreference?: string
    authenticatorAttachment?: string
    requireResidentKey?: string
    userVerificationRequirement?: string
    createTimeout?: number | string
    excludeCredentialIds?: string
    isSetRetry?: boolean
  }>
  'login-update-password.ftl': CommonPageOverride
  'link-idp-action.ftl': CommonPageOverride & Extendable<{
    idpDisplayName?: string
  }>
  'login-update-profile.ftl': CommonPageOverride & Extendable<{
    profile?: UserProfileOverride
    passwordPolicies?: PasswordPoliciesOverride
  }>
  'login-idp-link-confirm.ftl': CommonPageOverride & Extendable<{
    idpAlias?: string
  }>
  'login-idp-link-email.ftl': CommonPageOverride & Extendable<{
    idpAlias?: string
    brokerContext?: { username?: string }
  }>
  'login-page-expired.ftl': CommonPageOverride
  'login-config-totp.ftl': CommonPageOverride & Extendable<{
    mode?: 'qr' | 'manual' | null
    totp?: {
      totpSecretEncoded?: string
      qrUrl?: string
      policy?: {
        algorithm?: string
        digits?: number
        lookAheadWindow?: number
        type?: 'totp' | 'hotp'
        period?: number
        initialCounter?: number
      }
      supportedApplications?: string[]
      totpSecretQrCode?: string
      manualUrl?: string
      totpSecret?: string
      otpCredentials?: OtpCredentialOverride[]
    }
  }>
  'logout-confirm.ftl': CommonPageOverride & Extendable<{
    logoutConfirm?: { code?: string, skipLink?: boolean }
  }>
  'idp-review-user-profile.ftl': CommonPageOverride & Extendable<{
    profile?: UserProfileOverride
    passwordPolicies?: PasswordPoliciesOverride
  }>
  'update-email.ftl': CommonPageOverride & Extendable<{
    profile?: UserProfileOverride
    passwordPolicies?: PasswordPoliciesOverride
  }>
  'select-authenticator.ftl': CommonPageOverride & Extendable<{
    auth?: AuthOverride & {
      authenticationSelections?: AuthenticationSelectionOverride[]
    }
  }>
  'saml-post-form.ftl': CommonPageOverride & Extendable<{
    samlPost?: {
      url?: string
      SAMLRequest?: string
      SAMLResponse?: string
      relayState?: string
    }
  }>
  'delete-credential.ftl': CommonPageOverride & Extendable<{
    credentialLabel?: string
  }>
  'code.ftl': CommonPageOverride & Extendable<{
    code?: { success?: boolean, code?: string, error?: string }
  }>
  'delete-account-confirm.ftl': CommonPageOverride & Extendable<{
    triggered_from_aia?: boolean
  }>
  'frontchannel-logout.ftl': CommonPageOverride & Extendable<{
    logout?: {
      clients?: Array<{ name?: string, frontChannelLogoutUrl?: string }>
      logoutRedirectUri?: string
    }
  }>
  'login-recovery-authn-code-config.ftl': CommonPageOverride & Extendable<{
    recoveryAuthnCodesConfigBean?: {
      generatedRecoveryAuthnCodesList?: string[]
      generatedRecoveryAuthnCodesAsString?: string
      generatedAt?: number
    }
  }>
  'login-recovery-authn-code-input.ftl': CommonPageOverride & Extendable<{
    recoveryAuthnCodesInputBean?: { codeNumber?: number }
  }>
  'login-reset-otp.ftl': CommonPageOverride & Extendable<{
    configuredOtpCredentials?: {
      userOtpCredentials?: OtpCredentialOverride[]
      selectedCredentialId?: string
    }
  }>
  'login-x509-info.ftl': CommonPageOverride & Extendable<{
    x509?: {
      formData?: {
        subjectDN?: string
        isUserEnabled?: boolean
        username?: string
      }
    }
  }>
  'webauthn-error.ftl': CommonPageOverride
  'login-passkeys-conditional-authenticate.ftl': CommonPageOverride & Extendable<{
    registrationDisabled?: boolean
    isUserIdentified?: boolean | 'true' | 'false'
    challenge?: string
    userVerification?: string
    rpId?: string
    createTimeout?: number | string
    authenticators?: AuthenticatorCollectionOverride
    shouldDisplayAuthenticators?: boolean
    usernameHidden?: boolean
    login?: { username?: string }
  }>
  'login-idp-link-confirm-override.ftl': CommonPageOverride & Extendable<{
    idpDisplayName?: string
  }>
  'select-organization.ftl': CommonPageOverride & Extendable<{
    user?: {
      organizations?: Array<{ alias?: string, name?: string }>
    }
  }>
}

export type PageOverride = CommonPageOverride
export type ContextOverride<P extends KnownPageId = KnownPageId> = PageOverrideById[P]
export type StateOverridesById<P extends PageId = PageId> = Record<string, P extends KnownPageId ? PageOverrideById[P] : PageOverride>

export interface KcPageConfig {
  pages?: {
    [P in PageId]?: P extends KnownPageId ? PageOverrideById[P] : PageOverride
  }
}

export type StatesByPageId = {
  [P in PageId]?: P extends KnownPageId ? Record<string, PageOverrideById[P]> : Record<string, PageOverride>
}

export function defineConfig(config: KcPageConfig): KcPageConfig {
  return config
}

export function defineStates(states: StatesByPageId): StatesByPageId {
  return states
}
