<#import "footer.ftl" as loginFooter>
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
            const registrationPill = event.target.closest("#kc-registration > span");
            if (registrationPill) {
                const registrationLink = registrationPill.querySelector("a[href]");
                const clickedLink = event.target.closest("a[href]");
                if (registrationLink && !clickedLink) {
                    event.preventDefault();
                    registrationLink.click();
                    return;
                }
            }

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
</head>

<body id="keycloak-bg" class="${properties.kcBodyClass!}<#if kteColorMode == 'dark'> ${properties.kcDarkModeClass!'kcDarkModeClass pf-v5-theme-dark'}</#if>" data-page-id="login-${pageId}">
<div class="${properties.kcLoginClass!}">
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
        <#assign realmName = realm.displayName!realm.name!''>
        <#if !realmName?has_content>
            <#assign realmName = realm.displayNameHtml!''>
        </#if>
        <div id="kc-header-wrapper">
            <span id="kc-realm-name" data-kc-state="realm-name">${kcSanitize(msg("loginTitleHtml",(realm.displayNameHtml!'')))?no_esc}</span>
            <#if clientName?has_content>
                <span id="kc-client-name" data-kc-state="client-name" data-kc-client="name">${kcSanitize(clientName)?no_esc}</span>
            </#if>
        </div>
    </header>

    <div class="${properties.kcFormCardClass!}">
        <header class="${properties.kcFormHeaderClass!}">
            <div class="kc-horizontal-card-logo" data-kc-state="header-logo" aria-hidden="true"></div>
            <h1 id="kc-page-title"><#nested "header"></h1>
            <#if clientName?has_content || realmName?has_content>
                <p class="kc-horizontal-card-subtitle" data-kc-state="header-subtitle">
                    <#if clientName?has_content>
                        <span class="kc-horizontal-card-client-name" data-kc-state="header-client-name">${kcSanitize(clientName)?no_esc}</span>
                    </#if>
                    <#if realmName?has_content>
                        <span class="kc-horizontal-card-realm-name" data-kc-state="header-realm-name">${kcSanitize(realmName)?no_esc}</span>
                    </#if>
                </p>
            </#if>
        </header>

        <div id="kc-content">
            <div id="kc-content-wrapper">
                <#if displayRequiredFields>
                    <div data-kc-content-placeholder="requiredFields" class="${properties.kcContentWrapperClass!}">
                        <div class="${properties.kcLabelWrapperClass!} subtitle">
                            <span class="${properties.kcInputHelperTextItemTextClass!}">
                                <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                            </span>
                        </div>
                    </div>
                </#if>
                <#-- Keep info/alert at the start of the right column for horizontal-card. -->
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
                    <div id="kc-info-message" data-kc-class="kcAlertClass" data-kc-state="info-message" data-kc-i18n-key="infoMessage" class="${properties.kcAlertClass!} pf-m-info">
                        <div class="${properties.kcAlertIconClass!}">
                            <span class="${properties.kcFeedbackInfoIcon!}"></span>
                        </div>
                        <span class="${properties.kcAlertTitleClass!} kc-feedback-text">${msg("infoMessage")}</span>
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
                    <div id="kc-info" class="${properties.kcSignUpClass!}">
                        <div id="kc-info-wrapper" class="${properties.kcInfoAreaWrapperClass!}">
                            <#nested "info">
                        </div>
                    </div>
                </#if>
                
                <#nested "socialProviders">
            </div>
        </div>
    </div>

    <div class="kc-horizontal-card-footer-under-card">
        <@loginFooter.content/>
    </div>
</div>
</body>
</html>
</#macro>
