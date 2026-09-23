import type { FrameworkBinding } from './types'

/**
 * Only map classes whose native HTML contract matches Keycloak's FreeMarker output.
 * Checkboxes, selects and alerts use the token bridge instead of Carbon's extra wrappers.
 */
export const CARBON_BINDING: FrameworkBinding = {
  id: 'carbon',
  label: 'Carbon',
  frameworkCss: '',
  bindingCss: '',
  cssVariablePrefix: '--cds-',
  customCssPath: 'css/carbon-custom.css',
  defaults: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    primaryColor: '#0f62fe',
    secondaryColor: '#393939',
    borderRadius: 'sharp',
    cardShadow: 'none',
  },
  classMap: {
    kcButtonClass: 'cds--btn',
    kcButtonPrimaryClass: 'cds--btn cds--btn--primary',
    kcButtonSecondaryClass: 'cds--btn cds--btn--tertiary',
    kcButtonLinkClass: 'cds--btn cds--btn--ghost',
    kcFormPasswordVisibilityButtonClass: 'cds--btn cds--btn--ghost',
    kcFormSocialAccountListButtonClass: 'cds--btn cds--btn--tertiary',
    kcInputClass: 'cds--text-input',
    kcFormGroupClass: 'cds--form-item',
    kcLabelClass: 'cds--label',
    kcFormLabelClass: 'cds--label',
    kcInputHelperTextClass: 'cds--form__helper-text',
    kcInputErrorMessageClass: 'cds--form-requirement',
  },
}
