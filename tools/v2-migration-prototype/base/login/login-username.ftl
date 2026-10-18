<#import "template.ftl" as layout>
<#import "passkeys.ftl" as passkeys>
<#import "login-username-field.ftl" as usernameField>
<#import "login-remember-me.ftl" as rememberMe>
<#import "login-submit.ftl" as submit>
<#import "login-social-providers.ftl" as socialProviders>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username') displayInfo=(realm.password && realm.registrationAllowed && !registrationDisabled??); section>
    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <#if realm.password>
                    <form id="kc-form-login" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                        <#if !usernameHidden??>
                            <#assign label><#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if></#assign>
                            <@usernameField.show label=label value=login.username!'' error=messagesPerField.get('username') invalid=messagesPerField.existsError('username') tabindex=1 autocomplete="${(enableWebAuthnConditionalUI?has_content)?then('username webauthn', 'username')}" />
                        </#if>

                        <@rememberMe.group checked=login.rememberMe?? enabled=(realm.rememberMe && !usernameHidden??) tabindex=3 />

                        <@submit.show tabindex=4 />
                    </form>
                </#if>
            </div>
        </div>
        <@passkeys.conditionalUIData />
    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration">
                <span>${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
            </div>
        </#if>
    <#elseif section = "socialProviders">
        <#if realm.password && social?? && social.providers?has_content>
            <@socialProviders.show social=social headingLevel=4 />
        </#if>
    </#if>
</@layout.registrationLayout>
