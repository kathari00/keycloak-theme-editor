<#import "template.ftl" as layout>
<#import "passkeys.ftl" as passkeys>
<#import "login-username-field.ftl" as usernameField>
<#import "login-password-field.ftl" as passwordField>
<#import "login-submit.ftl" as submit>
<#import "login-social-providers.ftl" as socialProviders>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <#if realm.password>
                    <form id="kc-form-login" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                        <#if !usernameHidden??>
                            <#assign label><#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if></#assign>
                            <@usernameField.show label=label value=login.username!'' error=messagesPerField.getFirstError('username','password') invalid=messagesPerField.existsError('username','password') errorId="input-error" autocomplete="${(enableWebAuthnConditionalUI?has_content)?then('username webauthn', 'username')}" />
                        </#if>

                        <#assign passwordError="">
                        <#if usernameHidden??><#assign passwordError=messagesPerField.get('password')></#if>
                        <@passwordField.show error=passwordError invalid=passwordError?has_content tabindex=3 autocomplete="current-password" forgotPassword=realm.resetPasswordAllowed rememberMe=(realm.rememberMe && !usernameHidden??) rememberMeChecked=login.rememberMe?? />
                        <@passwordField.options forgotPassword=realm.resetPasswordAllowed rememberMe=(realm.rememberMe && !usernameHidden??) rememberMeChecked=login.rememberMe?? />

                        <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                        <@submit.show />
                    </form>
                </#if>
            </div>
        </div>
        <@passkeys.conditionalUIData />
        <@passwordField.script />
    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration-container">
                <div id="kc-registration">
                    <span>${msg("noAccount")} <a tabindex="8" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
                </div>
            </div>
        </#if>
    <#elseif section = "socialProviders">
        <#if realm.password && social?? && social.providers?has_content>
            <@socialProviders.show social=social />
        </#if>
    </#if>
</@layout.registrationLayout>
