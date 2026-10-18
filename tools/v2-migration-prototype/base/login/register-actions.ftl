<#macro show>
    <#if recaptchaRequired?? && !(recaptchaVisible!false)>
        <script>
            function onSubmitRecaptcha(token) {
                document.getElementById("kc-register-form").requestSubmit();
            }
        </script>
        <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
            <button class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!} g-recaptcha"
                    data-sitekey="${recaptchaSiteKey}" data-callback="onSubmitRecaptcha" data-action="${recaptchaAction}" type="submit" id="kc-submit">
                ${msg("doRegister")}
            </button>
        </div>
    <#else>
        <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
            <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("doRegister")}" />
        </div>
    </#if>

    <div class="${properties.kcFormGroupClass!} ${properties.kcLoginMainFooterBand!}">
        <div id="kc-form-options" class="${properties.kcFormOptionsClass!} ${properties.kcLoginMainFooterBandItem!}">
            <div class="${properties.kcFormOptionsWrapperClass!}">
                <span><a href="${url.loginUrl}">${msg("backToLogin")}</a></span>
            </div>
        </div>
    </div>
</#macro>
