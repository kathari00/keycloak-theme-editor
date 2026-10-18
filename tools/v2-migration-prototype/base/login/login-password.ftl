<#import "template.ftl" as layout>
<#import "login-password-field.ftl" as passwordField>
<#import "login-submit.ftl" as submit>
<#import "passkeys.ftl" as passkeys>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password'); section>
    <#if section = "header">
        ${msg("doLogIn")}
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <form id="kc-form-login" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                    <@passwordField.show error=messagesPerField.get('password') invalid=messagesPerField.existsError('password') autofocus=true autocomplete="current-password" separator=true forgotPassword=realm.resetPasswordAllowed />
                    <@passwordField.options forgotPassword=realm.resetPasswordAllowed />

                    <@submit.show tabindex=4 />
                </form>
            </div>
        </div>
        <@passkeys.conditionalUIData />
        <@passwordField.script />
    </#if>
</@layout.registrationLayout>
