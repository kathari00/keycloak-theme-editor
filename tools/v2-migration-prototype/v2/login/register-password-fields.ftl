<#import "field.ftl" as field>
<#import "password-validation.ftl" as validator>

<#macro show>
    <@field.password name="password" required=true label=msg("password") autocomplete="new-password" />
    <@field.password name="password-confirm" required=true label=msg("passwordConfirm") autocomplete="new-password" />
</#macro>

<#macro scripts>
    <@validator.templates />
    <@validator.script field="password" />
</#macro>
