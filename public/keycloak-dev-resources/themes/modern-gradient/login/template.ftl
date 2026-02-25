<#import "footer.ftl" as loginFooter>
<#macro username>
  <#assign label>
    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
  </#assign>
  <div class="${properties.kcFormGroupClass!}">
    <label for="username" class="${properties.kcLabelClass!}">${label}</label>
    <div class="${properties.kcInputGroup!}">
      <div class="${properties.kcInputGroupItemClass!} ${properties.kcFill!}">
        <span class="${properties.kcInputClass!} ${properties.kcFormReadOnlyClass!}">
          <input id="kc-attempted-username" value="${auth.attemptedUsername}" readonly>
        </span>
      </div>
      <div class="${properties.kcInputGroupItemClass!}">
        <button id="reset-login" class="${properties.kcFormPasswordVisibilityButtonClass!} kc-login-tooltip" type="button"
              aria-label="${msg('restartLoginTooltip')}" onclick="location.href='${url.loginRestartFlowUrl}'">
            <i class="fa-sync-alt fas" aria-hidden="true"></i>
            <span class="kc-tooltip-text">${msg("restartLoginTooltip")}</span>
        </button>
      </div>
    </div>
  </div>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<#assign kteColorMode = (properties["x-kte-color-mode"]!"system")?lower_case>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}<#if kteColorMode == 'dark'> ${properties.kcDarkModeClass!'kcDarkModeClass pf-v5-theme-dark'}</#if>" lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="<#if kteColorMode == 'dark'>dark<#elseif kteColorMode == 'light'>light<#else>light dark</#if>">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <#if kteColorMode == 'system' && darkMode?? && darkMode>
      <script type="module" async blocking="render">
          const DARK_MODE_CLASS = "${properties.kcDarkModeClass!'kcDarkModeClass pf-v5-theme-dark'}";
          const darkModeClasses = DARK_MODE_CLASS.split(/\s+/).filter(Boolean);
          const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

          const syncDarkMode = () => updateDarkMode(mediaQuery.matches);

          syncDarkMode();
          if (!document.body) {
            document.addEventListener("DOMContentLoaded", syncDarkMode, { once: true });
          }
          mediaQuery.addEventListener("change", (event) => updateDarkMode(event.matches));

          function updateDarkMode(isEnabled) {
            const targets = [document.documentElement, document.body].filter(Boolean);

            for (const target of targets) {
              if (isEnabled) {
                target.classList.add(...darkModeClasses);
              } else {
                target.classList.remove(...darkModeClasses);
              }
            }
          }
      </script>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <script type="module">
        <#outputformat "JavaScript">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";

        startSessionPolling(
            ${url.ssoLoginInOtherTabsUrl?c}
        );
        </#outputformat>
    </script>
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");

            if (!link) {
                return;
            }

            if (link.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }

            const { disabledClass } = link.dataset;

            if (disabledClass) {
                link.classList.add(...disabledClass.trim().split(/\s+/));
            }

            link.setAttribute("role", "link");
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#if authenticationSession??>
        <script type="module">
             <#outputformat "JavaScript">
            import { checkAuthSession } from "${url.resourcesPath}/js/authChecker.js";

            checkAuthSession(
                ${authenticationSession.authSessionIdHash?c}
            );
            </#outputformat>
        </script>
    </#if>
    <script>
      // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1404468
      const isFirefox = true;
    </script>
</head>

<body id="keycloak-bg" class="${properties.kcBodyClass!}<#if kteColorMode == 'dark'> ${properties.kcDarkModeClass!'kcDarkModeClass pf-v5-theme-dark'}</#if>" data-page-id="login-${pageId}">
<div class="${properties.kcLogin!}">
  <div class="${properties.kcLoginContainer!}">
    <main class="${properties.kcLoginMain!}">

      <div class="${properties.kcLoginMainHeader!}">
            <header id="kc-header" class="${properties.kcHeaderClass!}">
        <#assign clientName = ''>
        <#if client??>
          <#assign clientName = client.name!''>
          <#if !clientName?has_content>
            <#assign clientName = client.clientId!''>
          </#if>
        </#if>
        <#if !clientName?has_content>
          <#assign clientName = realm.displayNameHtml!''>
        </#if>
        <div id="kc-header-wrapper" class="${properties.kcHeaderWrapperClass!}">
          <h1 id="kc-realm-name" data-kc-state="realm-name">${kcSanitize(msg("loginTitleHtml",(realm.displayNameHtml!'')))?no_esc}</h1>
          <#if clientName?has_content>
            <p id="kc-client-name" data-kc-state="client-name" data-kc-client="name">${kcSanitize(clientName)?no_esc}</p>
          </#if>
        </div>
</header>
        <h2 class="${properties.kcLoginMainTitle!}" id="kc-page-title"><#nested "header"></h2>
      </div>
      <div class="${properties.kcLoginMainBody!}">
        <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
            <#if displayRequiredFields>
                <div class="${properties.kcContentWrapperClass!}">
                    <div class="${properties.kcLabelWrapperClass!} subtitle">
                        <span class="${properties.kcInputHelperTextItemTextClass!}">
                          <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                        </span>
                    </div>
                </div>
            </#if>
        <#else>
            <#if displayRequiredFields>
                <div class="${properties.kcContentWrapperClass!}">
                    <div class="${properties.kcLabelWrapperClass!} subtitle">
                        <span class="${properties.kcInputHelperTextItemTextClass!}">
                          <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                        </span>
                    </div>
                    <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                        <#nested "show-username">
                        <@username />
                    </div>
                </div>
            <#else>
                <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                  <#nested "show-username">
                  <@username />
                </div>
            </#if>
        </#if>

        <#-- App-initiated actions should not see warning messages about the need to complete the action -->
        <#-- during login.                                                                               -->
                                <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                    <div data-kc-class="kcAlertClass" data-kc-state="message-container" class="${properties.kcAlertClass!} pf-m-${(message.type = 'error')?then('danger', message.type)}">
                        <div class="${properties.kcAlertIconClass!}">
                            <#if message.type = 'success'><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
                            <#if message.type = 'warning'><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
                            <#if message.type = 'error'><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
                            <#if message.type = 'info'><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
                        </div>
                        <span class="${properties.kcAlertTitleClass!} kc-feedback-text">${message.summary}</span>
                    </div>
                <#elseif msg("infoMessage")?has_content>
                    <div id="kc-info-message" data-kc-class="kcAlertClass kcInfo" data-kc-state="info-message" data-kc-i18n-key="infoMessage" class="${properties.kcAlertClass!} kcInfo">
                        <div class="${properties.kcAlertIconClass!}">
                            <span class="${properties.kcFeedbackInfoIcon!}"></span>
                        </div>
                        <h1 class="${properties.kcAlertTitleClass!} kc-feedback-text">${msg("infoMessage")}</h1>
                    </div>
                </#if>

                <#nested "form">

        <#if auth?has_content && auth.showTryAnotherWayLink()>
          <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
              <input type="hidden" name="tryAnotherWay" value="on"/>
              <a id="try-another-way" href="javascript:document.forms['kc-select-try-another-way-form'].requestSubmit()"
                  class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass} ${properties.kcMarginTopClass}">
                    ${msg("doTryAnotherWay")}
              </a>
          </form>
        </#if>

          <#if displayInfo>
            <#assign infoContent>
              <#nested "info">
            </#assign>
            <div id="kc-info" class="${properties.kcFormClass}">
              <div id="kc-info-wrapper" class="${properties.kcContentWrapperClass!}">
                ${infoContent?no_esc}
              </div>
            </div>
          </#if>

               <div class="${properties.kcLoginMainFooter!}">
              <#nested "socialProviders">
          </div>
          <div class="${properties.kcLoginMainFooter!}">
            <div class="${properties.kcLoginMainFooterBand!} kc-footer-row" data-kc-state="footer-row">
              <#if realm.internationalizationEnabled  && locale.supported?size gt 1>
                <div class="${properties.kcLoginMainFooterBandItem!} kc-footer-language" data-kc-state="language-selector">
                  <select
                    aria-label="${msg("languages")}"
                    id="login-select-toggle"
                    class="kc-language-select"
                    onchange="if (this.value) window.location.href=this.value"
                  >
                    <#list locale.supported?sort_by("label") as l>
                      <option
                        value="${l.url}"
                        ${(l.languageTag == locale.currentLanguageTag)?then('selected','')}
                      >
                        ${l.label}
                      </option>
                    </#list>
                  </select>
                </div>
              </#if>
              <#if msg("imprintUrl")?has_content || msg("dataProtectionUrl")?has_content>
              <div class="kc-footer-legal-links ${properties.kcLoginMainFooterBandItem!}">
                <#if msg("imprintUrl")?has_content>
                  <a data-kc-state="imprint-link" href="${msg("imprintUrl")}" target="_blank" rel="noopener noreferrer">${msg("imprintLabel")}</a>
                </#if>
                <#if msg("dataProtectionUrl")?has_content>
                  <a data-kc-state="data-protection-link" href="${msg("dataProtectionUrl")}" target="_blank" rel="noopener noreferrer">${msg("dataProtectionLabel")}</a>
                </#if>
              </div>
              </#if>
            </div>
          </div>
      </div>
    </main>
  </div>
</div>
</body>
</html>

</#macro>
