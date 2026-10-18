<#macro show label value="" error="" invalid=false errorId="input-error-username" tabindex=2 autocomplete="username">
    <div class="${properties.kcFormGroupClass!}">
        <label for="username" class="${properties.kcLabelClass!}">${label}</label>
        <input tabindex="${tabindex}" id="username" class="${properties.kcInputClass!}" name="username"
               value="${value}" type="text" autofocus autocomplete="${autocomplete}"
               aria-invalid="<#if invalid>true</#if>" dir="ltr"/>
        <#if error?has_content>
            <span id="${errorId}" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                ${kcSanitize(error)?no_esc}
            </span>
        </#if>
    </div>
</#macro>
