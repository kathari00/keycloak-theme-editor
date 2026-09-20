import type { FrameworkBinding } from './types'

/**
 * `kc*Class` property key -> Bootstrap classes to append. Covers the core components that
 * actually render on the login/register/OTP pages (buttons, inputs/forms, alerts, checkboxes,
 * panels) — grounded against the real rendered markup in `src/features/preview/generated/pages.json`.
 * Less-used slots (locale dropdown, social-login list, OTP tile grid) are intentionally left
 * unmapped for now and keep the theme's own bare `kc*` look until a follow-up covers them.
 */
export const BOOTSTRAP_CLASS_MAP: Record<string, string> = {
  // Buttons
  kcButtonClass: 'btn',
  kcButtonPrimaryClass: 'btn btn-primary',
  // Outline, not a solid fill: the token bridge gives neutral actions each variant's semantic
  // secondary text color, avoiding invisible controls in variants whose raw secondary swatch is
  // the same color as the card (for example Lux's white secondary on a white surface).
  kcButtonSecondaryClass: 'btn btn-outline-secondary',
  kcButtonLinkClass: 'btn btn-link',
  kcButtonBlockClass: 'w-100',
  kcFormPasswordVisibilityButtonClass: 'btn btn-outline-secondary',

  // Social login list: `kcFormSocialAccountListClass` and `...ListGridClass` land on the same
  // <ul> (theme.properties concatenates both hooks' values there) - all the row setup goes on
  // the first key, since Bootstrap's row/col flex grid can't be mixed with a second, competing
  // display mode from the other one.
  kcFormSocialAccountSectionClass: 'mt-4',
  kcFormSocialAccountListClass: 'list-unstyled row row-cols-2 g-2 mt-3',
  kcFormSocialAccountGridItem: 'col',
  kcFormSocialAccountListButtonClass: 'btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2',

  // Inputs / forms
  kcInputClass: 'form-control',
  kcInputGroup: 'input-group',
  kcFormGroupClass: 'mb-3',
  kcFormGroupLabelClass: 'form-label',
  kcFormLabelClass: 'form-label',
  kcLabelClass: 'form-label',
  kcInputErrorMessageClass: 'invalid-feedback d-block',
  kcInputHelperTextClass: 'form-text',
  kcFormActionGroupClass: 'd-grid gap-2 mt-3',
  kcSelectAuthListItemClass: 'btn btn-outline-secondary w-100 text-start mb-2',
  // kcFormSettingClass is the row wrapping the "remember me" checkbox and the forgot-password
  // link (kcFormOptionsWrapperClass is just the inner wrapper around the link itself).
  kcFormSettingClass: 'd-flex justify-content-between align-items-center mb-3',

  // Alerts (Keycloak varies severity via a hardcoded extra class in the template, e.g. `kcInfo`,
  // which theme.properties can't see — this maps the base alert look only, not per-severity color).
  kcAlertClass: 'alert alert-info',

  // Checkboxes
  kcCheckboxClass: 'form-check',
  kcCheckboxInputClass: 'form-check-input',
  kcCheckboxLabelClass: 'form-check-label',

  // Panels / cards
  kcPanelClass: 'card',
  kcPanelMainClass: 'card-body',
  kcFormCardClass: 'card p-4',
}

export const BOOTSTRAP_BINDING: FrameworkBinding = {
  id: 'bootstrap',
  label: 'Bootstrap',
  frameworkCss: '',
  bindingCss: '',
  cssVariablePrefix: '--bs-',
  customCssPath: 'css/bootstrap-custom.css',
  // No palette here: each Bootswatch variant's colors are read from its compiled CSS instead.
  defaults: { fontFamily: 'var(--bs-font-sans-serif)' },
  classMap: BOOTSTRAP_CLASS_MAP,
}
