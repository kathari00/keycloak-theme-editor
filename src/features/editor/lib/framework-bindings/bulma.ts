import type { FrameworkBinding } from './types'

/**
 * Only map classes whose native HTML contract matches Keycloak's FreeMarker output. Bulma's
 * `.select` and `.file` wrappers need extra markup the templates don't emit, so those slots stay
 * on the token bridge instead.
 */
export const BULMA_BINDING: FrameworkBinding = {
  id: 'bulma',
  label: 'Bulma',
  frameworkCss: '',
  bindingCss: '',
  cssVariablePrefix: '--bulma-',
  customCssPath: 'css/bulma-custom.css',
  // Bulma ships Inter as the first entry of its own family variable, and the generated CSS
  // embeds the font, so pointing at the variable keeps one source of truth for the stack.
  defaults: {
    fontFamily: 'var(--bulma-family-primary)',
    primaryColor: '#00d1b2',
    secondaryColor: '#485fc7',
    borderRadius: 'rounded',
    cardShadow: 'subtle',
  },
  colorSchemeAttribute: { name: 'data-theme', light: 'light', dark: 'dark' },
  classMap: {
    kcButtonClass: 'button',
    kcButtonPrimaryClass: 'button is-primary',
    kcButtonSecondaryClass: 'button is-link is-outlined',
    kcButtonLinkClass: 'button is-ghost',
    kcButtonBlockClass: 'is-fullwidth',
    kcFormPasswordVisibilityButtonClass: 'button',
    kcFormSocialAccountSectionClass: 'mt-5',
    kcFormSocialAccountListClass: 'buttons',
    kcFormSocialAccountListButtonClass: 'button is-fullwidth',
    kcInputClass: 'input',
    kcFormGroupClass: 'field',
    kcFormGroupLabelClass: 'label',
    kcFormLabelClass: 'label',
    kcLabelClass: 'label',
    kcInputErrorMessageClass: 'help is-danger',
    kcInputHelperTextClass: 'help',
    kcFormActionGroupClass: 'field mt-4',
    kcSelectAuthListItemClass: 'button is-fullwidth is-justify-content-flex-start mb-2',
    kcAlertClass: 'notification is-info is-light',
    kcCheckboxClass: 'checkbox',
    kcPanelClass: 'box',
    kcFormCardClass: 'box',
  },
}
