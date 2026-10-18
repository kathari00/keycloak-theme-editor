<#macro show checked=false tabindex=5>
    <div class="checkbox">
        <label>
            <input tabindex="${tabindex}" id="rememberMe" name="rememberMe" type="checkbox" <#if checked>checked</#if>>
            ${msg("rememberMe")}
        </label>
    </div>
</#macro>

<#macro group checked=false enabled=false tabindex=5>
    <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
        <div id="kc-form-options">
            <#if enabled><@show checked=checked tabindex=tabindex /></#if>
        </div>
    </div>
</#macro>
