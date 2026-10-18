<#macro show error="" invalid=false tabindex=2 autofocus=false autocomplete="on" separator=false forgotPassword=false rememberMe=false rememberMeChecked=false>
    <div class="${properties.kcFormGroupClass!} no-bottom-margin">
        <#if separator><hr/></#if>
        <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label>
        <div class="${properties.kcInputGroup!}" dir="ltr">
            <input tabindex="${tabindex}" id="password" class="${properties.kcInputClass!}" name="password"
                   type="password" autocomplete="${autocomplete}" <#if autofocus>autofocus</#if>
                   aria-invalid="<#if invalid>true</#if>"
            />
            <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg('showPassword')}"
                    aria-controls="password" data-password-toggle
                    data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}" data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                    data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
            </button>
        </div>
        <#if error?has_content>
            <span id="input-error-password" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                ${kcSanitize(error)?no_esc}
            </span>
        </#if>
    </div>
</#macro>

<#macro options forgotPassword=false rememberMe=false rememberMeChecked=false>
    <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
        <div id="kc-form-options">
            <#if rememberMe>
                <div class="checkbox">
                    <label>
                        <input tabindex="5" id="rememberMe" name="rememberMe" type="checkbox" <#if rememberMeChecked>checked</#if>>
                        ${msg("rememberMe")}
                    </label>
                </div>
            </#if>
            <div class="${properties.kcFormOptionsWrapperClass!}">
                <#if forgotPassword>
                    <span><a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a></span>
                </#if>
            </div>
        </div>
    </div>
</#macro>

<#macro script>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
</#macro>
