<#import "field.ftl" as field>

<#macro show error="" invalid=false tabindex=2 autofocus=false autocomplete="on" separator=false forgotPassword=false rememberMe=false rememberMeChecked=false>
    <@field.password name="password" label=msg("password") error=error forgotPassword=forgotPassword autofocus=autofocus autocomplete=autocomplete>
        <#if rememberMe>
            <@field.checkbox name="rememberMe" label=msg("rememberMe") value=rememberMeChecked />
        </#if>
    </@field.password>
</#macro>

<#macro options forgotPassword=false rememberMe=false rememberMeChecked=false></#macro>
<#-- The v2 layout already includes passwordVisibility.js. -->
<#macro script></#macro>
