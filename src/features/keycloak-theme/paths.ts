import { propertiesSuffixForLocale } from '../i18n/locale-catalog'

export const KEYCLOAK_THEMES_ROOT_PATH = '/keycloak-dev-resources/themes'
export const KEYCLOAK_THEMES_CONFIG_PATH = `${KEYCLOAK_THEMES_ROOT_PATH}/themes.json`

export const THEME_MESSAGES_EN_PATH = 'messages/messages_en.properties'
export const THEME_MESSAGES_DEFAULT_PATH = 'messages/messages.properties'
export const THEME_MESSAGES_DIR = 'messages'
export const THEME_PROPERTIES_PATH = 'theme.properties'
export const THEME_RESOURCES_PATH = 'resources'
export const THEME_TEMPLATE_FTL_PATH = 'template.ftl'
export const THEME_FOOTER_FTL_PATH = 'footer.ftl'

export const THEME_PREVIEW_CSS_PATH = 'css/preview.css'
export const THEME_QUICK_START_CSS_PATH = 'css/quick-start.css'
export const THEME_STYLES_CSS_PATH = 'css/styles.css'
export const THEME_FAVICON_RESOURCE_PATH = 'img/favicon.ico'

/** `de` -> `messages/messages_de.properties`, `zh-CN` -> `messages/messages_zh_Hans.properties`. */
export function themeMessagesLocalePath(localeTag: string): string {
  return `${THEME_MESSAGES_DIR}/messages_${propertiesSuffixForLocale(localeTag)}.properties`
}

export function themeLoginPath(themeId: string, loginRelativePath: string): string {
  return `${KEYCLOAK_THEMES_ROOT_PATH}/${themeId}/login/${loginRelativePath}`
}

export function themeLoginResourcePath(themeId: string, resourceRelativePath: string): string {
  return themeLoginPath(themeId, `${THEME_RESOURCES_PATH}/${resourceRelativePath}`)
}
