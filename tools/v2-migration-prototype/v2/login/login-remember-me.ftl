<#import "field.ftl" as field>

<#macro show checked=false tabindex=5>
    <@field.checkbox name="rememberMe" label=msg("rememberMe") value=checked />
</#macro>

<#macro group checked=false enabled=false tabindex=5>
    <div class="${properties.kcFormGroupClass!}">
        <#if enabled><@show checked=checked tabindex=tabindex /></#if>
    </div>
</#macro>
