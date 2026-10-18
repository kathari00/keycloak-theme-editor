<#macro show>
    <#list ["password", "password-confirm"] as name>
        <div class="${properties.kcFormGroupClass!}">
            <div class="${properties.kcLabelWrapperClass!}">
                <label for="${name}" class="${properties.kcLabelClass!}">${msg(name == "password"?then("password", "passwordConfirm"))}</label>
                <span class="required">*</span>
            </div>
            <div class="${properties.kcInputWrapperClass!}">
                <div class="${properties.kcInputGroup!}" dir="ltr">
                    <input type="password" id="${name}" class="${properties.kcInputClass!}" name="${name}" autocomplete="new-password"
                           aria-invalid="<#if messagesPerField.existsError(name)>true</#if>" />
                    <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg('showPassword')}"
                            aria-controls="${name}" data-password-toggle
                            data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}" data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                            data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                        <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
                    </button>
                </div>
                <#if messagesPerField.existsError(name)>
                    <span id="input-error-${name}" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                        ${kcSanitize(messagesPerField.get(name))?no_esc}
                    </span>
                </#if>
            </div>
        </div>
    </#list>
</#macro>

<#macro scripts>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
</#macro>
